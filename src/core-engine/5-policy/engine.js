'use strict';

const controlPolicies = require('./policies/v2-first-success-control');
const fastPathPolicies = require('./policies/v2-fast-path-experiment');

/** @typedef {import('../constants').PolicyName} PolicyName */
/** @typedef {import('../constants').PrimaryNeed} PrimaryNeed */
/** @typedef {import('../constants').PolicySetId} PolicySetId */

/**
 * @typedef {Object} EngineContext
 * @property {PolicySetId} activePolicySet
 * @property {Date} currentDeviceTime
 */

/**
 * @typedef {Object} PolicyDirective
 * @property {string} id
 * @property {PolicyName} name
 * @property {Object} validityWindow
 * @property {number} validityWindow.startHour
 * @property {number} validityWindow.endHour
 * @property {Date} validityWindow.expiresAt
 * @property {Object} uiTokens
 * @property {import('../constants').UiTheme} uiTokens.theme
 * @property {import('../constants').UiIntensity} uiTokens.intensity
 * @property {readonly string[]} uiTokens.tags
 */

const POLICY_SETS = Object.freeze({
  v2_first_success_control: controlPolicies,
  v2_fast_path_experiment: fastPathPolicies,
});

/**
 * @param {PrimaryNeed} need
 * @param {EngineContext} context
 * @param {import('../1-facts/types').FamilyFacts} facts
 * @returns {PolicyDirective}
 */
function applyPolicy(need, context, facts) {
  const ruleset = POLICY_SETS[context.activePolicySet] || controlPolicies;
  return ruleset.resolve(need, context, facts);
}

module.exports = {
  applyPolicy,
  POLICY_SETS,
};
