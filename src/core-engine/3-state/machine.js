'use strict';

const { infer } = require('../2-inference/infer');

/** @typedef {import('../constants').CoreState} CoreState */

/**
 * Deterministic state machine. Milestones are monotonic except DORMANT-style recovery.
 * @param {import('../1-facts/types').FamilyFacts} facts
 * @param {import('../2-inference/infer').InferenceFlags} inf
 * @returns {CoreState}
 */
function determineState(facts, inf) {
  if (facts._incomplete) return 'UNCERTAINTY_FALLBACK';
  if (facts.openedCustomize) return 'CUSTOMIZING';

  if (!facts.hasRoutine && facts.childrenIds.length === 0) return 'REGISTERED';
  if (!facts.hasRoutine) return 'REGISTERED';
  if (!facts.hasSeenChildView) return 'ROUTINE_READY';
  if (!inf.hasFirstSuccess) {
    return inf.isStagnant ? 'CHILD_SEEN' : 'CHILD_SEEN';
  }

  if (facts.firstDayCompletedAt) {
    if (inf.daysSinceSignup >= 7 && inf.hasActiveLoop) return 'WEEK_1';
    if (facts.currentStreakDays >= 3) return 'STREAK_3';
    return 'FIRST_DAY_COMPLETE';
  }

  if (inf.hasFirstSuccess) return 'FIRST_ACTIVITY';
  return 'REGISTERED';
}

module.exports = { determineState };
