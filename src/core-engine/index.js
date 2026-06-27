'use strict';

const { infer } = require('./2-inference/infer');
const { determineState } = require('./3-state/machine');
const { assessNeed } = require('./4-needs/assessor');
const { applyPolicy } = require('./5-policy/engine');
const { generateTraceLog } = require('./trace');
const { deriveMilestone } = require('./milestone');
const { ENGINE_MODE } = require('./constants');

/**
 * @typedef {import('./5-policy/engine').EngineContext} EngineContext
 * @typedef {import('./5-policy/engine').PolicyDirective} PolicyDirective
 * @typedef {import('./1-facts/types').FamilyFacts} FamilyFacts
 */

/**
 * @typedef {Object} DecisionTrace
 * @property {import('./constants').CoreState} coreState
 * @property {import('./constants').PrimaryNeed} evaluatedNeed
 * @property {string} activePolicy
 * @property {readonly string[]} rulesTriggered
 * @property {import('./constants').PolicySetId} [policySet]
 */

/**
 * @typedef {Object} EngineOutput
 * @property {Date} timestamp
 * @property {PolicyDirective} policy
 * @property {string|null} milestone
 * @property {DecisionTrace} trace
 */

class ProductEngine {
  /**
   * Deterministic product logic. Same facts + same context → same output.
   * @param {FamilyFacts} facts
   * @param {EngineContext} context
   * @returns {EngineOutput}
   */
  static evaluate(facts, context) {
    try {
      ProductEngine._assertFrozenContract(facts, context);
      const inferences = infer(facts, context.currentDeviceTime);
      const state = determineState(facts, inferences);
      const need = assessNeed(state, inferences, facts);
      const policy = applyPolicy(need, context, facts);
      const milestone = deriveMilestone(facts, inferences, state);
      const rulesTriggered = generateTraceLog(facts, inferences, state, need);

      return {
        timestamp: context.currentDeviceTime,
        policy,
        milestone,
        trace: {
          coreState: state,
          evaluatedNeed: need,
          activePolicy: policy.name,
          rulesTriggered,
          policySet: context.activePolicySet,
        },
      };
    } catch (error) {
      return ProductEngine.handleFallback(facts, context, error);
    }
  }

  /**
   * @param {FamilyFacts} facts
   * @param {EngineContext} context
   * @param {unknown} error
   * @returns {EngineOutput}
   */
  static handleFallback(facts, context, error) {
    const now = context?.currentDeviceTime || new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (error) {
      console.error(`[ProductEngine] fallback for family ${facts?.familyId}:`, error);
    }
    return {
      timestamp: now,
      policy: {
        id: `fallback_${facts?.familyId || 'unknown'}`,
        name: 'SHOW_CHILD',
        validityWindow: { startHour: 0, endHour: 24, expiresAt },
        uiTokens: { theme: 'DEFAULT', intensity: 'LOW', tags: ['FALLBACK'] },
      },
      milestone: null,
      trace: {
        coreState: 'UNCERTAINTY_FALLBACK',
        evaluatedNeed: 'NEEDS_CLARITY',
        activePolicy: 'SHOW_CHILD',
        rulesTriggered: ['error_fallback_triggered'],
        policySet: context?.activePolicySet || 'v2_first_success_control',
      },
    };
  }

  /**
   * @param {FamilyFacts} facts
   * @param {EngineContext} context
   */
  static _assertFrozenContract(facts, context) {
    if (ENGINE_MODE !== 'FROZEN') return;
    if (!facts?.familyId) throw new Error('FROZEN: familyId required');
    if (!context?.activePolicySet) throw new Error('FROZEN: policySet required');
  }
}

module.exports = {
  ProductEngine,
  collectFamilyFacts: require('./1-facts/collector').collectFamilyFacts,
  normalizeFamilyFacts: require('./1-facts/collector').normalizeFamilyFacts,
  serializeEngineOutput: require('./serialize').serializeEngineOutput,
  recordOutcome: require('./outcome/record-outcome').recordOutcome,
};
