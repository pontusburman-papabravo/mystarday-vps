'use strict';

/**
 * Narrow limited-account exception for first-run onboarding only.
 * Premium families and grandfathered families are not gated here.
 */
const activationDb = require('../../db/family-activation-state');

function getDb() {
  return require('./db');
}
const { resolveFamilyEntitlements } = require('./family-entitlements');
const {
  findResumableChildWithoutSchema,
  childHasScheduleItems,
} = require('./onboarding-child-resume');

const LIMITED_ONBOARDING_READ_PATHS = new Set([
  '/api/onboarding/template-groups',
  '/api/onboarding/schedule-preview',
  '/api/onboarding/rewards-preview',
  '/api/onboarding/handoff-context',
  '/api/onboarding/starter-plan/preview',
]);

const EARLY_BOOTSTRAP_POST_PATHS = new Set([
  '/api/onboarding/child',
  '/api/onboarding/schedule',
  '/api/onboarding/starter-plan/suggest',
  '/api/onboarding/starter-plan/personalize',
]);

const LATE_BOOTSTRAP_POST_PATHS = new Set([
  '/api/onboarding/weekend-schedule',
  '/api/onboarding/reward',
  '/api/onboarding/child-view',
  '/api/onboarding/child-activity-guide',
  '/api/onboarding/update-pin',
  '/api/onboarding/complete',
  '/api/onboarding/child-access-complete',
]);

function normalizeOnboardingPath(req) {
  const raw = req.originalUrl?.split('?')[0] || req.path || '';
  if (!raw.startsWith('/api/onboarding/')) return raw;
  return raw.replace(/\/+$/, '') || raw;
}

function isLimitedOnboardingReadPath(path) {
  return LIMITED_ONBOARDING_READ_PATHS.has(path);
}

function isLimitedBootstrapFinished(state) {
  if (!state?.schema_saved_at) return false;
  if (state.child_access_completed_at) return true;
  if (state.handoff_film_completed_at) return true;
  const deferrals = state.step_deferrals;
  if (deferrals && typeof deferrals === 'object' && deferrals.limited_onboarding_finished_at) {
    return true;
  }
  return false;
}

async function markLimitedOnboardingBootstrapFinished(familyId, at = new Date()) {
  if (!familyId) return;
  const { ensureActivationState } = require('./activation-p0');
  await ensureActivationState(familyId, at);
  await getDb().query(
    `UPDATE family_activation_state
     SET step_deferrals = jsonb_set(
           COALESCE(step_deferrals, '{}'::jsonb),
           '{limited_onboarding_finished_at}',
           to_jsonb($2::text),
           true
         ),
         updated_at = now()
     WHERE family_id = $1`,
    [familyId, at.toISOString()]
  );
}

async function canLimitedPostOnboardingChild(req, familyId) {
  const childCountRes = await getDb().query(
    'SELECT COUNT(*)::int AS count FROM child WHERE family_id = $1',
    [familyId]
  );
  const childCount = childCountRes.rows[0]?.count ?? 0;
  if (childCount === 0) return true;

  const name = req.body?.name;
  if (!name || typeof name !== 'string') return false;
  const resumable = await findResumableChildWithoutSchema(getDb(), familyId, name.trim());
  return Boolean(resumable);
}

async function canLimitedPostOnboardingSchedule(req) {
  const childId = req.body?.child_id;
  if (!childId) return false;
  const hasSchedule = await childHasScheduleItems(getDb(), childId);
  return !hasSchedule;
}

async function evaluateLimitedOnboardingMutation(req, state, familyId) {
  const path = normalizeOnboardingPath(req);
  const method = req.method?.toUpperCase();
  if (method !== 'POST') return false;
  if (isLimitedBootstrapFinished(state)) return false;

  if (EARLY_BOOTSTRAP_POST_PATHS.has(path)) {
    if (path === '/api/onboarding/child') {
      return canLimitedPostOnboardingChild(req, familyId);
    }
    if (path === '/api/onboarding/schedule') {
      return canLimitedPostOnboardingSchedule(req);
    }
    return true;
  }

  if (LATE_BOOTSTRAP_POST_PATHS.has(path)) {
    if (!state?.schema_saved_at) return false;
    if (path === '/api/onboarding/weekend-schedule') {
      return Boolean(req.body?.child_id);
    }
    return true;
  }

  return false;
}

/**
 * Parent limited-account onboarding exception (server-authoritative).
 * @param {import('express').Request} req
 * @returns {Promise<boolean>}
 */
async function isLimitedOnboardingRequestAllowed(req) {
  const path = normalizeOnboardingPath(req);
  if (!path.startsWith('/api/onboarding/')) return false;

  const familyId = req.user?.familyId || req.user?.family_id;
  if (!familyId) return false;

  const { premium, requires_paywall } = await resolveFamilyEntitlements(familyId);
  if (premium.active) return true;
  if (requires_paywall === false) return true;

  const method = req.method?.toUpperCase();
  if (method === 'GET' && isLimitedOnboardingReadPath(path)) return true;

  const state = await activationDb.getByFamilyId(familyId);
  return evaluateLimitedOnboardingMutation(req, state, familyId);
}

module.exports = {
  LIMITED_ONBOARDING_READ_PATHS,
  EARLY_BOOTSTRAP_POST_PATHS,
  LATE_BOOTSTRAP_POST_PATHS,
  normalizeOnboardingPath,
  isLimitedOnboardingReadPath,
  isLimitedBootstrapFinished,
  markLimitedOnboardingBootstrapFinished,
  isLimitedOnboardingRequestAllowed,
};
