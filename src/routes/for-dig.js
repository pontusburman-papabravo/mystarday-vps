'use strict';

/**
 * Parent-facing För dig routes.
 */

const express = require('express');
const { requireParent } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');
const authz = require('../middleware/authz');
const db = require('../lib/db');
const { validateLocale } = require('../lib/locale');
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
  getGoalsForLocale,
} = require('../lib/for-dig-config');
const { sendApiError } = require('../lib/api-user-error');

const router = express.Router();
router.use(requireParent);
router.use(requireFeature('for_dig'));

function trackEvent(familyId, eventType, metadata) {
  analytics.track(familyId, eventType, metadata).catch(() => {});
}

router.get('/goals', async (req, res) => {
  try {
    const localeResult = await db.query(
      `SELECT COALESCE(preferred_locale, 'sv-SE') AS preferred_locale FROM family WHERE id = $1`,
      [req.user.familyId]
    );
    const locale = validateLocale(localeResult.rows[0]?.preferred_locale);
    res.json({ goals: getGoalsForLocale(locale) });
  } catch (err) {
    console.error('[FOR-DIG] goals error:', err);
    sendApiError(res, 500, 'FOR_DIG_LOAD_GOALS');
  }
});

router.get('/installs', async (req, res) => {
  try {
    const rows = await feedbackDb.getInstallsForParent(req.user.id);
    res.json({ installs: rows });
  } catch (err) {
    console.error('[FOR-DIG] installs error:', err);
    sendApiError(res, 500, 'FOR_DIG_LOAD_ACTIVATIONS');
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
    sendApiError(res, 500, 'FOR_DIG_LOAD_POPULAR');
  }
});

router.get('/favorites', async (req, res) => {
  try {
    const favorites = await favoritesDb.listFavorites(req.user.id, req.user.familyId);
    res.json(favorites);
  } catch (err) {
    console.error('[FOR-DIG] favorites list error:', err);
    sendApiError(res, 500, 'FOR_DIG_LOAD_FAVORITES');
  }
});

router.post('/favorites', async (req, res) => {
  const { goal_slug: goalSlug } = req.body || {};
  if (!goalSlug) {
    return sendApiError(res, 400, 'GOAL_SLUG_REQUIRED');
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
    sendApiError(res, status, 'FOR_DIG_SAVE_FAVORITE');
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
    return sendApiError(res, 400, 'GOAL_SLUG_PHASE_REQUIRED');
  }

  if (!getGoalBySlug(goalSlug)) {
    return sendApiError(res, 404, 'GOAL_NOT_FOUND');
  }

  if (!['intent', 'outcome', 'suggestion'].includes(phase)) {
    return sendApiError(res, 400, 'INVALID_PHASE');
  }

  if ((phase === 'intent' || phase === 'outcome') && !childId) {
    return sendApiError(res, 400, 'CHILD_ID_INTENT_REQUIRED');
  }

  if (phase === 'intent' && (!intentReason || !VALID_INTENT_REASONS.has(intentReason))) {
    return sendApiError(res, 400, 'INVALID_INTENT_REASON');
  }

  if (phase === 'outcome') {
    const score = parseInt(outcomeScore, 10);
    if (!score || score < 1 || score > 4) {
      return sendApiError(res, 400, 'OUTCOME_SCORE_RANGE');
    }
  }

  if (freeText && String(freeText).length > 500) {
    return sendApiError(res, 400, 'FREETEXT_MAX');
  }

  try {
    let familyId = req.user.familyId;
    let scopedChildId = childId || null;
    if (childId) {
      const child = await authz.getChildAccess(req.user.id, childId);
      if (!child) {
        return sendApiError(res, 403, 'FOR_DIG_CHILD_ACCESS');
      }
      familyId = child.family_id;
      scopedChildId = child.id;
    }

    await feedbackDb.insertFeedback({
      familyId,
      parentId: req.user.id,
      childId: scopedChildId,
      goalSlug,
      phase,
      intentReason: intentReason || null,
      outcomeScore: outcomeScore ? parseInt(outcomeScore, 10) : null,
      freeText: freeText || null,
    });

    if (phase === 'intent') {
      trackEvent(familyId, 'for_dig_feedback_intent', {
        goal_slug: goalSlug,
        intent_reason: intentReason,
        child_id: scopedChildId,
      });
    } else if (phase === 'outcome') {
      trackEvent(familyId, 'for_dig_feedback_outcome', {
        goal_slug: goalSlug,
        outcome_score: outcomeScore,
        child_id: scopedChildId,
      });
    } else {
      trackEvent(familyId, 'for_dig_feedback_suggestion', {
        goal_slug: goalSlug,
        free_text: freeText ? '(provided)' : null,
      });
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === '23505') {
      return sendApiError(res, 409, 'FOR_DIG_ALREADY_ANSWERED');
    }
    console.error('[FOR-DIG] feedback error:', err);
    sendApiError(res, 500, 'FOR_DIG_SAVE_ANSWER');
  }
});

router.get('/feedback/pending', async (req, res) => {
  try {
    const pending = await feedbackDb.getPendingOutcomes(req.user.familyId, req.user.id);
    res.json(pending);
  } catch (err) {
    console.error('[FOR-DIG] pending error:', err);
    sendApiError(res, 500, 'FOR_DIG_LOAD_FEEDBACK');
  }
});

router.post('/feedback/dismiss', async (req, res) => {
  const { child_id: childId, goal_slug: goalSlug } = req.body || {};
  const familyId = req.user.familyId;
  if (!childId || !goalSlug) {
    return sendApiError(res, 400, 'CHILD_ID_INTENT_REQUIRED');
  }
  if (!getGoalBySlug(goalSlug)) {
    return sendApiError(res, 404, 'GOAL_NOT_FOUND');
  }
  try {
    const child = await authz.getChildAccess(req.user.id, childId);
    if (!child) {
      return sendApiError(res, 403, 'FOR_DIG_CHILD_ACCESS');
    }
    await feedbackDb.dismissPendingOutcome({
      parentId: req.user.id,
      familyId: child.family_id,
      childId: child.id,
      goalSlug,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[FOR-DIG] dismiss error:', err);
    return sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

router.post('/:slug/preview-plan', async (req, res) => {
  const { slug } = req.params;
  const { child_ids: childIdsBody } = req.body || {};

  const goal = getGoalBySlug(slug);
  if (!goal) {
    return sendApiError(res, 404, 'GOAL_NOT_FOUND');
  }

  const childIds = Array.isArray(childIdsBody) ? childIdsBody.filter(Boolean) : [];
  if (childIds.length === 0) {
    return sendApiError(res, 400, 'FOR_DIG_CHILDREN_REQUIRED');
  }

  try {
    const plan = await buildActivationPlanPreview({
      parentId: req.user.id,
      childIds,
      goalSlug: slug,
    });
    if (!plan) {
      return sendApiError(res, 404, 'GOAL_NOT_FOUND');
    }
    res.json(plan);
  } catch (err) {
    console.error('[FOR-DIG] preview-plan error:', err);
    const status = err.status || 500;
    sendApiError(res, status, err.code || 'FOR_DIG_LOAD_PLAN');
  }
});

router.get('/:slug/preview', async (req, res) => {
  const { slug } = req.params;
  const goal = getGoalBySlug(slug);
  if (!goal) {
    return sendApiError(res, 404, 'GOAL_NOT_FOUND');
  }

  try {
    const preview = await getGoalActivationPreview(slug);
    if (!preview) {
      return sendApiError(res, 404, 'GOAL_NOT_FOUND');
    }
    res.json(preview);
  } catch (err) {
    console.error('[FOR-DIG] preview error:', err);
    sendApiError(res, 500, 'FOR_DIG_LOAD_PREVIEW');
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
    return sendApiError(res, 400, 'FOR_DIG_CHILDREN_REQUIRED');
  }

  const goal = getGoalBySlug(slug);
  if (!goal) {
    return sendApiError(res, 404, 'GOAL_NOT_FOUND');
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
    sendApiError(res, status, err.code || 'FOR_DIG_ACTIVATE_FAILED');
  }
});

module.exports = router;
