'use strict';

const activationDb = require('../../../db/family-activation-state');
const { DEFER_DURATION_MS, isDeferrableActivationAction } = require('./defer-constants');

/**
 * @param {object|null|undefined} stepDeferrals
 * @param {string} nextAction
 * @param {Date} [now]
 * @returns {{ deferred_at: string, until: string }|null}
 */
function getActiveDeferral(stepDeferrals, nextAction, now = new Date()) {
  if (!nextAction || !stepDeferrals || typeof stepDeferrals !== 'object') return null;
  const entry = stepDeferrals[nextAction];
  if (!entry || typeof entry !== 'object' || !entry.until) return null;
  const untilMs = new Date(entry.until).getTime();
  if (Number.isNaN(untilMs) || untilMs <= now.getTime()) return null;
  return {
    deferred_at: entry.deferred_at || null,
    until: new Date(untilMs).toISOString(),
  };
}

/**
 * @param {object} payload Canonical payload before defer overlay.
 * @param {object|null|undefined} stepDeferrals
 * @param {{ now?: Date }} [options]
 */
function applyDeferralOverlay(payload, stepDeferrals, options = {}) {
  const now = options.now || new Date();
  if (!payload?.enabled || !payload.next_action || payload.next_action === 'none') {
    return { ...payload, deferred: false };
  }
  // Activation defer never overlays Journey Retention (reuses child_access / await_first_completion).
  if (payload.authority === 'journey_retention') {
    return { ...payload, deferred: false };
  }
  const active = getActiveDeferral(stepDeferrals, payload.next_action, now);
  if (!active) {
    return { ...payload, deferred: false };
  }
  const reason = Array.isArray(payload.reason) ? [...payload.reason] : [];
  if (!reason.includes('deferred_by_user')) reason.push('deferred_by_user');
  return {
    ...payload,
    show_primary_coach: false,
    deferred: true,
    deferred_until: active.until,
    reason,
  };
}

/**
 * Persist defer for the current incomplete activation step.
 * @param {string} familyId
 * @param {string} nextAction — must be allowlisted
 * @param {Date} [now]
 * @returns {Promise<{ deferred_at: string, until: string }>}
 */
async function deferActivationStep(familyId, nextAction, now = new Date()) {
  if (!isDeferrableActivationAction(nextAction)) {
    const err = new Error('invalid_activation_action');
    err.code = 'INVALID_ACTIVATION_ACTION';
    throw err;
  }
  const deferredAt = now.toISOString();
  const until = new Date(now.getTime() + DEFER_DURATION_MS).toISOString();
  await activationDb.setStepDeferral(familyId, nextAction, deferredAt, until);
  return { deferred_at: deferredAt, until };
}

module.exports = {
  getActiveDeferral,
  applyDeferralOverlay,
  deferActivationStep,
  DEFER_DURATION_MS,
};
