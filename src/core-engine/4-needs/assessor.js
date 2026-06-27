'use strict';

/** @typedef {import('../constants').PrimaryNeed} PrimaryNeed */
/** @typedef {import('../constants').CoreState} CoreState */

/**
 * Map stable state + inference → domain need. No product actions here.
 * @param {CoreState} state
 * @param {import('../2-inference/infer').InferenceFlags} inf
 * @param {import('../1-facts/types').FamilyFacts} facts
 * @returns {PrimaryNeed}
 */
function assessNeed(state, inf, facts) {
  if (inf.isStagnant && !inf.hasFirstSuccess) return 'NEEDS_WINBACK';
  if (state === 'UNCERTAINTY_FALLBACK') return 'NEEDS_CLARITY';

  switch (state) {
    case 'REGISTERED':
    case 'ROUTINE_READY':
      return 'NEEDS_CLARITY';
    case 'CHILD_SEEN':
      return 'NEEDS_MOMENTUM';
    case 'FIRST_ACTIVITY':
    case 'FIRST_DAY_COMPLETE':
      return facts.hasEveningRoutine ? 'NEEDS_CUSTOMIZATION' : 'NEEDS_CONSISTENCY';
    case 'STREAK_3':
    case 'WEEK_1':
      return 'NEEDS_CUSTOMIZATION';
    case 'CUSTOMIZING':
      return 'NEEDS_CUSTOMIZATION';
    default:
      return inf.isStagnant ? 'NEEDS_WINBACK' : 'NEEDS_MOMENTUM';
  }
}

module.exports = { assessNeed };
