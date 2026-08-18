'use strict';

/**
 * Shared stuck-family classification (mirrors db/growth-stuck-cohorts.js CASE).
 * Used by admin preview and in-product system help — keep in sync with SQL.
 */

const { COHORTS } = require('./growth-stuck-work-queue');

const MIN_STUCK_AGE_MS = 48 * 60 * 60 * 1000;
const MAX_STUCK_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const RETURN_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
const RETURN_MIN_COMPLETION_AGE_MS = 3 * 24 * 60 * 60 * 1000;

function asDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {object} input
 * @param {boolean} [input.onboarding_completed]
 * @param {Date|string|null} [input.schema_saved_at]
 * @param {Date|string|null} [input.child_access_completed_at]
 * @param {Date|string|null} [input.first_completion_at]
 * @param {Date|string|null} [input.last_login_at]
 * @param {boolean} [input.has_core_flow_error]
 * @param {Date} [now]
 * @returns {string|null}
 */
function classifyBlockingStep(input, now = new Date()) {
  if (input.has_core_flow_error) return COHORTS.core_flow_errors;
  if (!input.onboarding_completed) return COHORTS.onboarding_incomplete;
  if (input.schema_saved_at && !input.child_access_completed_at) {
    return COHORTS.schema_no_child_login;
  }
  if (input.child_access_completed_at && !input.first_completion_at) {
    return COHORTS.login_no_completion;
  }
  const firstCompletion = asDate(input.first_completion_at);
  const lastLogin = asDate(input.last_login_at);
  if (
    firstCompletion
    && firstCompletion.getTime() < now.getTime() - RETURN_MIN_COMPLETION_AGE_MS
    && (!lastLogin || lastLogin.getTime() < now.getTime() - RETURN_IDLE_MS)
  ) {
    return COHORTS.completion_no_return;
  }
  return null;
}

/**
 * @param {string} blockingStep
 * @param {object} input
 * @returns {Date|null}
 */
function stuckSinceAt(blockingStep, input) {
  switch (blockingStep) {
    case COHORTS.schema_no_child_login:
      return asDate(input.schema_saved_at) || asDate(input.family_created_at);
    case COHORTS.login_no_completion:
      return asDate(input.child_access_completed_at) || asDate(input.family_created_at);
    case COHORTS.completion_no_return:
      return asDate(input.first_completion_at) || asDate(input.family_created_at);
    case COHORTS.core_flow_errors:
      return asDate(input.last_core_flow_error_at) || asDate(input.family_created_at);
    default:
      return asDate(input.family_created_at);
  }
}

/**
 * Stuck cohort window: family age 48h–14d and blocking step present.
 * @param {object} input
 * @param {Date|string} input.family_created_at
 * @param {Date} [now]
 * @returns {{ blockingStep: string|null, stuckSinceAt: Date|null, inWindow: boolean }}
 */
function evaluateStuckFamily(input, now = new Date()) {
  const created = asDate(input.family_created_at);
  if (!created) {
    return { blockingStep: null, stuckSinceAt: null, inWindow: false };
  }
  const ageMs = now.getTime() - created.getTime();
  const inWindow = ageMs >= MIN_STUCK_AGE_MS && ageMs <= MAX_STUCK_AGE_MS;
  const blockingStep = classifyBlockingStep(input, now);
  if (!blockingStep || !inWindow) {
    return { blockingStep: null, stuckSinceAt: null, inWindow };
  }
  return {
    blockingStep,
    stuckSinceAt: stuckSinceAt(blockingStep, input),
    inWindow: true,
  };
}

module.exports = {
  MIN_STUCK_AGE_MS,
  MAX_STUCK_AGE_MS,
  classifyBlockingStep,
  stuckSinceAt,
  evaluateStuckFamily,
};
