'use strict';

const activationDb = require('../../db/family-activation-state');
const analytics = require('../../db/analytics');
const {
  reconcileP0State,
  isP0Activated,
  getActivationFunnelStep,
} = require('./activation-p0-core');

/**
 * Ensure activation state row exists (idempotent).
 * @param {string} familyId
 * @param {Date|string} [signupAt]
 * @param {string} [activationVariant]
 */
async function ensureActivationState(familyId, signupAt = new Date(), activationVariant = 'legacy') {
  const existing = await activationDb.getByFamilyId(familyId);
  if (existing) return existing;
  return activationDb.insertState(familyId, signupAt, activationVariant);
}

/**
 * @typedef {'child_created'|'schema_saved'|'child_access'|'first_completion'} ActivationMilestone
 */

/**
 * Update activation milestones (only sets timestamps when null).
 * @param {string} familyId
 * @param {ActivationMilestone} milestone
 * @param {object} [options]
 * @param {Date} [options.at]
 * @param {object} [options.metadata] analytics metadata
 */
async function updateActivationState(familyId, milestone, options = {}) {
  const at = options.at || new Date();
  const state = await ensureActivationState(familyId, at);

  const columnByMilestone = {
    child_created: 'child_created_at',
    schema_saved: 'schema_saved_at',
    child_access: 'child_access_completed_at',
    first_completion: 'first_completion_at',
  };
  const column = columnByMilestone[milestone];
  if (!column) return state;

  const patch = {};
  if (!state[column]) {
    patch[column] = at;
  }

  let next = state;
  if (Object.keys(patch).length > 0) {
    next = await activationDb.patchState(familyId, patch);
  }

  const reconciled = reconcileP0State(next, at);
  const wasP0 = Boolean(state.p0_activated_at);

  if (reconciled.p0ActivatedAt && !wasP0) {
    next = await activationDb.patchState(familyId, {
      p0_activated_at: reconciled.p0ActivatedAt,
      p0_activated_within_48h: reconciled.p0ActivatedWithin48h,
    });
    if (reconciled.p0ActivatedWithin48h) {
      analytics.track(familyId, 'activation_achieved_48h', {
        variant: next.activation_variant,
        ...options.metadata,
      });
    }
    try {
      const { isActivationFlagEnabled, FLAG_KEYS } = require('./activation-flags');
      const referralEnabled = await isActivationFlagEnabled(FLAG_KEYS.referral, familyId);
      if (referralEnabled) {
        const referralDb = require('../../db/referral');
        const qualified = await referralDb.qualifyReferralForFamily(familyId);
        if (qualified) {
          analytics.track(familyId, 'referral_qualified', { code: qualified.code });
        }
      }
    } catch (refErr) {
      console.error('[ACTIVATION-P0] referral qualify failed:', refErr.message);
    }
  }

  const eventByMilestone = {
    schema_saved: 'starter_plan_saved',
    child_access: 'child_access_completed',
    first_completion: 'first_completion_recorded',
  };
  const eventType = eventByMilestone[milestone];
  if (eventType && Object.keys(patch).length > 0) {
    analytics.track(familyId, eventType, {
      variant: next.activation_variant,
      ...options.metadata,
    });
  }

  if (Object.keys(patch).length > 0) {
    try {
      const { maybeRecordProgression } = require('./growth-system-help');
      await maybeRecordProgression(familyId, at);
    } catch (progressErr) {
      console.error('[ACTIVATION-P0] system help progression failed:', progressErr.message);
    }
  }

  return next;
}

/**
 * Like updateActivationState but reports whether the milestone timestamp was newly written.
 * Used by Meta App Events (and similar) to fire once on verified first write.
 * @returns {Promise<{ state: object, newlyRecorded: boolean }>}
 */
async function recordActivationMilestone(familyId, milestone, options = {}) {
  const at = options.at || new Date();
  const before = await ensureActivationState(familyId, at);
  const columnByMilestone = {
    child_created: 'child_created_at',
    schema_saved: 'schema_saved_at',
    child_access: 'child_access_completed_at',
    first_completion: 'first_completion_at',
  };
  const column = columnByMilestone[milestone];
  const alreadySet = column ? Boolean(before[column]) : true;
  const state = await updateActivationState(familyId, milestone, options);
  return { state, newlyRecorded: column ? !alreadySet : false };
}

async function setActivationVariant(familyId, variant) {
  await ensureActivationState(familyId);
  return activationDb.patchState(familyId, { activation_variant: variant });
}

/** Default variant for new signups when ACT-1 onboarding is live. */
async function resolveDefaultActivationVariant(familyId) {
  const { isActivationFlagEnabled, FLAG_KEYS } = require('./activation-flags');
  if (!await isActivationFlagEnabled(FLAG_KEYS.onboarding, familyId)) {
    return 'legacy';
  }
  if (await isActivationFlagEnabled(FLAG_KEYS.aiStarterPlan, familyId)) {
    return 'template_plus_ai';
  }
  return 'template_only';
}

module.exports = {
  ensureActivationState,
  updateActivationState,
  recordActivationMilestone,
  setActivationVariant,
  resolveDefaultActivationVariant,
  isP0Activated,
  getActivationFunnelStep,
  // re-export pure helpers for tests
  reconcileP0State,
};
