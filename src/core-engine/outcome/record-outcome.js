'use strict';

/**
 * Outcome layer — records what happened after a policy directive.
 * Enables the learning loop; Engine stays blind to outcomes on evaluate().
 */

/** @type {Map<string, import('./types').OutcomeFeedback[]>} */
const store = new Map();

/**
 * @typedef {Object} OutcomeFeedback
 * @property {string} familyId
 * @property {string} directiveId
 * @property {'ENGAGED'|'IGNORED'|'DISMISSED'} actionTaken
 * @property {number} latencyMs
 * @property {Date} recordedAt
 */

/**
 * @param {OutcomeFeedback} feedback
 */
function recordOutcome(feedback) {
  const key = feedback.familyId;
  const list = store.get(key) || [];
  list.push({
    ...feedback,
    recordedAt: feedback.recordedAt || new Date(),
  });
  store.set(key, list);
}

/**
 * @param {string} familyId
 * @returns {readonly OutcomeFeedback[]}
 */
function getOutcomesForFamily(familyId) {
  return store.get(familyId) || [];
}

/** Test helper */
function clearOutcomes() {
  store.clear();
}

module.exports = {
  recordOutcome,
  getOutcomesForFamily,
  clearOutcomes,
};
