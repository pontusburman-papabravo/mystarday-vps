'use strict';

const control = require('./v2-first-success-control');

/**
 * Fast-path experiment: same needs, different policy mapping for NEEDS_CONSISTENCY.
 * @param {import('../../constants').PrimaryNeed} need
 * @param {import('../engine').EngineContext} context
 * @param {import('../../../1-facts/types').FamilyFacts} facts
 */
function resolve(need, context, facts) {
  if (need === 'NEEDS_CONSISTENCY' && facts.rewardsClaimedCount === 0) {
    const base = control.resolve(need, context, facts);
    return {
      ...base,
      id: `fast_${facts.familyId}_${need}`,
      name: 'TRIGGER_CELEBRATION',
      uiTokens: { theme: 'CELEBRATION', intensity: 'HIGH', tags: ['FIRST_SUCCESS', 'FAST_PATH'] },
    };
  }
  return control.resolve(need, context, facts);
}

module.exports = { resolve };
