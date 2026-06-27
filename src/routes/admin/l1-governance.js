'use strict';

const express = require('express');
const l1Db = require('../../../db/l1-governance');
const { ACTIVE_RELEASE_ID } = require('../../lib/l1-governance-config');
const {
  recommendDecision,
  buildLogLine,
  questionPayload,
} = require('../../lib/l1-governance-decide');

const router = express.Router();

function learningDay(startedAt) {
  const ms = Date.now() - new Date(startedAt).getTime();
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

// GET /api/admin/l1-governance
router.get('/l1-governance', async (req, res, next) => {
  try {
    const release = await l1Db.ensureRelease(ACTIVE_RELEASE_ID);
    const metrics = await l1Db.getEngineMetrics7d();
    const decisions = await l1Db.listDecisions(ACTIVE_RELEASE_ID, 15);
    const day = learningDay(release.started_at);
    const lastAnswers = decisions[0]?.answers || {};
    const questions = questionPayload(metrics, day, lastAnswers);
    const draftAnswers = {};
    for (const q of questions) {
      draftAnswers[q.id] = q.recommended === 'yes';
    }
    const recommendation = recommendDecision(draftAnswers, { metrics, learning_day: day });

    res.json({
      release_id: ACTIVE_RELEASE_ID,
      state: release.state,
      started_at: release.started_at,
      learning_day: day,
      sla: {
        day_14_due: day >= 14,
        investigate_max_days: 7,
      },
      metrics,
      questions,
      recommendation: {
        decision_type: recommendation.decision_type,
        next_state: recommendation.state,
        reason: recommendation.reason,
        log_line_preview: buildLogLine(
          ACTIVE_RELEASE_ID,
          recommendation.decision_type,
          draftAnswers,
          req.user?.name || req.user?.email || 'admin'
        ),
      },
      decisions,
    });
  } catch (err) {
    console.error('[ADMIN] l1-governance GET error:', err);
    next(err);
  }
});

// POST /api/admin/l1-governance/decision
router.post('/l1-governance/decision', async (req, res, next) => {
  try {
    const { answers = {}, owner_label, confirm_recommendation, override_decision } = req.body || {};
    const release = await l1Db.ensureRelease(ACTIVE_RELEASE_ID);
    const metrics = await l1Db.getEngineMetrics7d();
    const day = learningDay(release.started_at);

    const normalized = {
      intent_ok: Boolean(answers.intent_ok),
      non_adoption_baseline: Boolean(answers.non_adoption_baseline),
      qualitative_drift: Boolean(answers.qualitative_drift),
      competition_drift: Boolean(answers.competition_drift),
      edge_case: Boolean(answers.edge_case),
    };

    let rec = recommendDecision(normalized, { metrics, learning_day: day });
    let decisionType = rec.decision_type;

    if (override_decision && typeof override_decision === 'string') {
      decisionType = override_decision;
      if (decisionType === 'ACCEPT-UNKNOWN') rec = { ...rec, state: 'STABLE' };
      else if (decisionType === 'ACT-SURFACE' || decisionType === 'ACT-KILL') rec = { ...rec, state: 'DRIFT' };
      else rec = { ...rec, state: 'LEARNING' };
    } else if (!confirm_recommendation) {
      return res.status(400).json({ error: 'Bekräfta rekommendationen eller välj override.' });
    }

    const owner = owner_label || req.user?.name || req.user?.email || 'admin';
    const logLine = buildLogLine(ACTIVE_RELEASE_ID, decisionType, normalized, owner);

    const row = await l1Db.insertDecision({
      release_id: ACTIVE_RELEASE_ID,
      decision_type: decisionType,
      log_line: logLine,
      answers: normalized,
      owner_label: owner,
      parent_id: req.user?.id,
    });

    await l1Db.setReleaseState(ACTIVE_RELEASE_ID, rec.state);

    res.json({
      ok: true,
      decision: row,
      state: rec.state,
      log_line: logLine,
    });
  } catch (err) {
    console.error('[ADMIN] l1-governance POST error:', err);
    next(err);
  }
});

module.exports = router;
