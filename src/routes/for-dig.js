'use strict';

/**
 * Parent-facing För dig routes.
 */

const express = require('express');
const { requireParent } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');
const analytics = require('../../db/analytics');
const feedbackDb = require('../../db/for-dig-goal-feedback');
const { activateGoal } = require('../lib/for-dig-activate');
const {
  FOR_DIG_GOALS,
  VALID_INTENT_REASONS,
  getGoalBySlug,
} = require('../lib/for-dig-config');

const router = express.Router();
router.use(requireParent);
router.use(requireFeature('for_dig'));

function trackEvent(familyId, eventType, metadata) {
  analytics.track(familyId, eventType, metadata).catch(() => {});
}

router.get('/goals', (req, res) => {
  res.json({ goals: FOR_DIG_GOALS });
});

router.get('/installs', async (req, res) => {
  try {
    const rows = await feedbackDb.getInstallsForFamily(req.user.familyId);
    res.json({ installs: rows });
  } catch (err) {
    console.error('[FOR-DIG] installs error:', err);
    res.status(500).json({ error: 'Kunde inte hämta aktiveringar' });
  }
});

router.get('/popular', async (req, res) => {
  try {
    const rows = await feedbackDb.getPopularGoals(90, 3);
    const goals = rows.map((row) => {
      const goal = getGoalBySlug(row.goal_slug);
      return {
        goal_slug: row.goal_slug,
        title: goal ? goal.title : row.goal_slug,
        icon: goal ? goal.icon : '⭐',
        install_count: row.install_count,
      };
    });
    res.json({ goals });
  } catch (err) {
    console.error('[FOR-DIG] popular error:', err);
    res.status(500).json({ error: 'Kunde inte hämta populära mål' });
  }
});

router.post('/feedback', async (req, res) => {
  const {
    goal_slug: goalSlug,
    child_id: childId,
    phase,
    intent_reason: intentReason,
    outcome_score: outcomeScore,
    free_text: freeText,
  } = req.body || {};

  if (!goalSlug || !phase) {
    return res.status(400).json({ error: 'goal_slug och phase krävs' });
  }

  if (!getGoalBySlug(goalSlug)) {
    return res.status(404).json({ error: 'Utvecklingsmålet hittades inte' });
  }

  if (!['intent', 'outcome', 'suggestion'].includes(phase)) {
    return res.status(400).json({ error: 'Ogiltig phase' });
  }

  if ((phase === 'intent' || phase === 'outcome') && !childId) {
    return res.status(400).json({ error: 'child_id krävs för intent och outcome' });
  }

  if (phase === 'intent' && (!intentReason || !VALID_INTENT_REASONS.has(intentReason))) {
    return res.status(400).json({ error: 'Ogiltig intent_reason' });
  }

  if (phase === 'outcome') {
    const score = parseInt(outcomeScore, 10);
    if (!score || score < 1 || score > 4) {
      return res.status(400).json({ error: 'outcome_score måste vara 1–4' });
    }
  }

  if (freeText && String(freeText).length > 500) {
    return res.status(400).json({ error: 'Fritext får vara max 500 tecken' });
  }

  try {
    await feedbackDb.insertFeedback({
      familyId: req.user.familyId,
      parentId: req.user.id,
      childId: childId || null,
      goalSlug,
      phase,
      intentReason: intentReason || null,
      outcomeScore: outcomeScore ? parseInt(outcomeScore, 10) : null,
      freeText: freeText || null,
    });

    if (phase === 'intent') {
      trackEvent(req.user.familyId, 'for_dig_feedback_intent', {
        goal_slug: goalSlug,
        intent_reason: intentReason,
        child_id: childId,
      });
    } else if (phase === 'outcome') {
      trackEvent(req.user.familyId, 'for_dig_feedback_outcome', {
        goal_slug: goalSlug,
        outcome_score: outcomeScore,
        child_id: childId,
      });
    } else {
      trackEvent(req.user.familyId, 'for_dig_feedback_suggestion', {
        goal_slug: goalSlug,
        free_text: freeText ? '(provided)' : null,
      });
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Du har redan svarat på den här frågan.' });
    }
    console.error('[FOR-DIG] feedback error:', err);
    res.status(500).json({ error: 'Kunde inte spara svaret' });
  }
});

router.get('/feedback/pending', async (req, res) => {
  try {
    const pending = await feedbackDb.getPendingOutcomes(req.user.familyId, req.user.id);
    res.json(pending);
  } catch (err) {
    console.error('[FOR-DIG] pending error:', err);
    res.status(500).json({ error: 'Kunde inte hämta väntande feedback' });
  }
});

router.post('/:slug/activate', async (req, res) => {
  const { slug } = req.params;
  const { child_id: childId, overwrite = true } = req.body || {};

  if (!childId) {
    return res.status(400).json({ error: 'child_id krävs' });
  }

  const goal = getGoalBySlug(slug);
  if (!goal) {
    return res.status(404).json({ error: 'Utvecklingsmålet hittades inte' });
  }

  trackEvent(req.user.familyId, 'for_dig_activate_click', { goal_slug: slug, child_id: childId });

  try {
    await feedbackDb.clearFeedbackForReactivation(req.user.familyId, childId, slug);
    const result = await activateGoal({
      parentId: req.user.id,
      familyId: req.user.familyId,
      childId,
      goalSlug: slug,
      overwrite: overwrite !== false,
    });

    await feedbackDb.logInstall(slug, req.user.familyId, childId);
    trackEvent(req.user.familyId, 'for_dig_activate_success', {
      goal_slug: slug,
      child_id: childId,
      schedule_id: result.schedule?.scheduleId || null,
    });
    trackEvent(req.user.familyId, 'for_dig_install_logged', { goal_slug: slug, child_id: childId });

    res.status(201).json({
      message: `${goal.title} är igång för ${result.child_name}!`,
      child_id: childId,
      child_name: result.child_name,
      goal_slug: slug,
      goal_title: goal.title,
    });
  } catch (err) {
    console.error('[FOR-DIG] activate error:', err);
    trackEvent(req.user.familyId, 'for_dig_activate_fail', {
      goal_slug: slug,
      error: err.message,
    });

    const status = err.status || 500;
    const message = status === 500
      ? 'Något gick fel vid aktivering. Försök igen eller gå till biblioteket.'
      : err.message;
    res.status(status).json({ error: message });
  }
});

module.exports = router;
