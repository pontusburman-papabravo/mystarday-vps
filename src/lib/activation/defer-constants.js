'use strict';

/** Fixed 12h cooldown — no family timezone dependency in v1 (#1023). */
const DEFER_DURATION_MS = 12 * 60 * 60 * 1000;

/**
 * Canonical first-success actions that may be deferred via POST /activation/defer.
 * Excludes post-first-success growth/retention actions.
 */
const DEFERRABLE_ACTIVATION_ACTIONS = new Set([
  'create_child',
  'save_schedule',
  'child_access',
  'parent_ack',
  'await_first_completion',
  'celebrate_first_success',
  'journey_coach',
  'engine_legacy',
]);

function isDeferrableActivationAction(action) {
  return typeof action === 'string' && DEFERRABLE_ACTIVATION_ACTIONS.has(action);
}

module.exports = {
  DEFER_DURATION_MS,
  DEFERRABLE_ACTIVATION_ACTIONS,
  isDeferrableActivationAction,
};
