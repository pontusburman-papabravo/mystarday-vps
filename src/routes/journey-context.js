'use strict';

const express = require('express');
const { requireParent } = require('../middleware/auth');
const { scopeRouterToPath } = require('../middleware/router-path-scope');
const familyMilestones = require('../../db/family-milestones');
const { getContextDerivation, getPhaseDerivation } = require('../lib/journey/evaluator');
const { ingestClientIntent } = require('../lib/journey/ingest');
const { buildContextForFamily } = require('../lib/journey/context-builder');
const { loadRegistry } = require('../lib/journey/registry');
const { FLAG_KEYS, isFlagEnabled, getFlagState } = require('../lib/journey/flags');
const { listUnseenCompletions, mapCompletionRow } = require('../lib/activation-program-aha');

const router = express.Router();
router.use(scopeRouterToPath('/journey-context', '/journey-debug'));
router.use(requireParent);

async function requireContextApi(req, res, next) {
  const enabled = await isFlagEnabled(FLAG_KEYS.contextApi);
  if (!enabled) {
    return res.status(503).json({ error: 'Family Journey API är inte aktiverat' });
  }
  next();
}

router.use(requireContextApi);

router.get('/journey-context', async (req, res) => {
  try {
    const familyId = req.user.familyId;
    if (!familyId) return res.status(400).json({ error: 'Ingen familj kopplad' });
    const pedagogSkip = req.user.accountType === 'educator' && req.user.preferredViewMode === 'pedagog';
    const context = await buildContextForFamily(familyId, { pedagogSkip });
    res.json(context);
  } catch (err) {
    console.error('[journey-context] GET error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

router.get('/journey-debug', async (req, res) => {
  try {
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const debugFlag = await isFlagEnabled(FLAG_KEYS.debugApi);
    if (!isDev && !debugFlag && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Ej behörig' });
    }
    const familyId = req.user.familyId;
    if (!familyId) return res.status(400).json({ error: 'Ingen familj kopplad' });

    const milestones = await familyMilestones.getMilestoneMap(familyId);
    const phase = await familyMilestones.getJourneyPhase(familyId);
    const context = await buildContextForFamily(familyId);
    const flags = await getFlagState();
    const phaseOpts = await require('../lib/journey/ingest').getPhaseOpts();

    res.json({
      phase: context.phase,
      phase_derivation: getPhaseDerivation(milestones, phaseOpts),
      context_derivation: getContextDerivation(context),
      milestones_raw: await familyMilestones.listRaw(familyId),
      flags,
      stored_phase: phase,
    });
  } catch (err) {
    console.error('[journey-context] debug error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

router.post('/journey-context/events', async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const { intent, child_id: childId, daily_log_item_id: dailyLogItemId } = req.body || {};
    if (!familyId || !intent) return res.status(400).json({ error: 'intent krävs' });

    const metadata = {};
    if (dailyLogItemId) metadata.daily_log_item_id = dailyLogItemId;
    if (intent === 'parent_ack_dismissed') metadata.parent_id = req.user.id;

    const result = await ingestClientIntent({
      familyId,
      intent,
      childId: childId || null,
      metadata,
    });

    if (!result.ok) {
      const status = result.error === 'invalid_phase' ? 409 : 400;
      return res.status(status).json({ error: result.error || 'Kunde inte registrera händelse' });
    }

    res.json({ ok: true, context: await buildContextForFamily(familyId) });
  } catch (err) {
    console.error('[journey-context] events error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

router.get('/journey-context/registry', async (req, res) => {
  try {
    const registry = await loadRegistry({
      useDb: await isFlagEnabled(FLAG_KEYS.registryV2),
    });
    res.json(registry);
  } catch (err) {
    res.status(500).json({ error: 'Något gick fel' });
  }
});

/**
 * Pending completions for parent-ack modal (Fas 2 — no activation program required).
 */
router.get('/journey-context/pending-completions', async (req, res) => {
  try {
    const ackOn = await isFlagEnabled(FLAG_KEYS.parentAckV1);
    if (!ackOn) return res.json({ completions: [] });

    const familyId = req.user.familyId;
    const parentId = req.user.id;
    if (!familyId) return res.json({ completions: [] });

    const rows = await listUnseenCompletions(parentId, familyId);
    const now = new Date();
    const platformRuntime = require('../lib/platform-runtime');
    const runtimeOn = await platformRuntime.isRuntimeEnabled();

    const completions = await Promise.all(rows.map(async (row) => {
      const mapped = mapCompletionRow(row, now);
      if (runtimeOn && row.child_id && row.daily_log_item_id) {
        const packFeedback = await platformRuntime.getParentFeedback(
          row.child_id,
          row.daily_log_item_id
        );
        if (packFeedback) {
          mapped.pack_feedback = packFeedback;
          mapped.headline = packFeedback.headline || mapped.headline;
          mapped.parent_message = packFeedback.parent_message;
        }
      }
      return mapped;
    }));

    res.json({ completions });
  } catch (err) {
    console.error('[journey-context] pending-completions error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

module.exports = router;
module.exports.buildContextForFamily = buildContextForFamily;
