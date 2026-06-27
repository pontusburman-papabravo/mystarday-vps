'use strict';

/**
 * @param {import('./1-facts/types').FamilyFacts} facts
 * @param {import('./2-inference/infer').InferenceFlags} inf
 * @param {import('./constants').CoreState} state
 * @returns {string|null}
 */
function deriveMilestone(facts, inf, state) {
  if (state === 'ROUTINE_READY' && facts.hasRoutine) return 'routine_ready';
  if (state === 'CHILD_SEEN' && facts.hasSeenChildView && !inf.hasFirstSuccess) return null;
  if (state === 'FIRST_ACTIVITY' && inf.hasFirstSuccess) return 'first_success';
  if (state === 'FIRST_DAY_COMPLETE') return 'first_day_complete';
  if (state === 'STREAK_3') return 'streak_3';
  if (state === 'WEEK_1') return 'week_1';
  return null;
}

module.exports = { deriveMilestone };
