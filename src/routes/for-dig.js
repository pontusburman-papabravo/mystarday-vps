'use strict';

/**
 * Parent-facing För dig routes.
 */

const express = require('express');
const { requireParent } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');
const analytics = require('../../db/analytics');
const feedbackDb = require('../../db/for-dig-goal-feedback');
const favoritesDb = require('../../db/for-dig-favorites');
const {
  activateGoal,
  buildActivationSuccessMessage,
  buildActivationNextStep,
  buildActivationPlanPreview,
  getGoalActivationPreview,
} = require('../lib/for-dig-activate');
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
    const minCount = parseInt(req.query.min_count, 10) || 5;
    const days = parseInt(req.query.days, 10) || 90;
    const rows = await favoritesDb.getInstallLeaderboard(days, minCount);
    res.json({ goals: rows });
  } catch (err) {
    console.error('[FOR-DIG] popular error:', err);
    res.status(500).json({ error: 'Kunde inte hämta populära mål' });
  }
});

router.get('/favorites', async (req, res) => {
  try {
    const favorites = await favoritesDb.listFavorites(req.user.id, req.user.familyId);
    res.json(favorites);
  } catch (err) {
    console.error('[FOR-DIG] favorites list error:', err);
    res.status(500).json({ error: 'Kunde inte hämta favoriter' });
  }
});

router.post('/favorites', async (req, res) => {
  const { goal_slug: goalSlug } = req.body || {};
  if (!goalSlug) {
    return res.status(400).json({ error: 'goal_slug krävs' });
  }

  try {
    const result = await favoritesDb.toggleGoalFavorite(
      req.user.id,
      req.user.familyId,
      goalSlug
    );
    trackEvent(req.user.familyId, 'for_dig_favorite_toggle', {
      entity_type: 'goal',
      goal_slug: goalSlug,
      is_favorite: result.is_favorite,
    });
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    console.error('[FOR-DIG] favorites toggle error:', err);
    res.status(status).json({ error: err.message || 'Kunde inte uppdatera favorit' });
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

router.post('/:slug/preview-plan', async (req, res) => {
  const { slug } = req.params;
  const { child_ids: childIdsBody } = req.body || {};

  const goal = getGoalBySlug(slug);
  if (!goal) {
    return res.status(404).json({ error: 'Utvecklingsmålet hittades inte' });
  }

  const childIds = Array.isArray(childIdsBody) ? childIdsBody.filter(Boolean) : [];
  if (childIds.length === 0) {
    return res.status(400).json({ error: 'Minst ett barn krävs (child_ids)' });
  }

  try {
    const plan = await buildActivationPlanPreview({
      parentId: req.user.id,
      childIds,
      goalSlug: slug,
    });
    if (!plan) {
      return res.status(404).json({ error: 'Utvecklingsmålet hittades inte' });
    }
    res.json(plan);
  } catch (err) {
    console.error('[FOR-DIG] preview-plan error:', err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Kunde inte ladda planen' });
  }
});

router.get('/:slug/preview', async (req, res) => {
  const { slug } = req.params;
  const goal = getGoalBySlug(slug);
  if (!goal) {
    return res.status(404).json({ error: 'Utvecklingsmålet hittades inte' });
  }

  try {
    const preview = await getGoalActivationPreview(slug);
    if (!preview) {
      return res.status(404).json({ error: 'Utvecklingsmålet hittades inte' });
    }
    res.json(preview);
  } catch (err) {
    console.error('[FOR-DIG] preview error:', err);
    res.status(500).json({ error: 'Kunde inte ladda förhandsvisning' });
  }
});

router.post('/:slug/activate', async (req, res) => {
  const { slug } = req.params;
  const {
    child_id: legacyChildId,
    child_ids: childIdsBody,
    overwrite = true,
    star_overrides: starOverrides,
  } = req.body || {};

  const childIds = Array.isArray(childIdsBody) && childIdsBody.length > 0
    ? childIdsBody
    : (legacyChildId ? [legacyChildId] : []);

  if (childIds.length === 0) {
    return res.status(400).json({ error: 'Minst ett barn krävs (child_ids)' });
  }

  const goal = getGoalBySlug(slug);
  if (!goal) {
    return res.status(404).json({ error: 'Utvecklingsmålet hittades inte' });
  }

  for (const childId of childIds) {
    trackEvent(req.user.familyId, 'for_dig_activate_click', { goal_slug: slug, child_id: childId });
  }

  try {
    const result = await activateGoal({
      parentId: req.user.id,
      familyId: req.user.familyId,
      childIds,
      goalSlug: slug,
      overwrite: overwrite !== false,
      starOverrides: starOverrides || null,
    });

    for (const childId of childIds) {
      await feedbackDb.clearFeedbackForReactivation(req.user.familyId, childId, slug);
      await feedbackDb.logInstall(slug, req.user.familyId, childId, req.user.id);
      trackEvent(req.user.familyId, 'for_dig_activate_success', {
        goal_slug: slug,
        child_id: childId,
        schedule_id: result.schedule?.scheduleId || null,
      });
      trackEvent(req.user.familyId, 'for_dig_install_logged', { goal_slug: slug, child_id: childId });
    }

    const primaryChildId = childIds[0];

    res.status(201).json({
      message: buildActivationSuccessMessage(goal, result),
      child_id: primaryChildId,
      child_ids: childIds,
      child_name: result.child_name,
      child_names: result.child_names,
      goal_slug: slug,
      goal_title: goal.title,
      next_step: buildActivationNextStep(result, primaryChildId),
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
