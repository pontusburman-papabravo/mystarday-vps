'use strict';

/**
 * @typedef {Object} InferenceFlags
 * @property {boolean} isNewUser
 * @property {boolean} hasFirstSuccess
 * @property {boolean} isStagnant
 * @property {boolean} hasActiveLoop
 * @property {number} hoursSinceSignup
 * @property {number} daysSinceSignup
 * @property {number|null} daysSinceLastActivity
 */

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Pure inference from facts. No DB, no UI, no policy.
 * @param {import('../1-facts/types').FamilyFacts} facts
 * @param {Date} [asOf]
 * @returns {InferenceFlags}
 */
function infer(facts, asOf = new Date()) {
  const asOfMs = asOf.getTime();
  const signupMs = facts.signupAt.getTime();
  const hoursSinceSignup = Math.max(0, (asOfMs - signupMs) / MS_PER_HOUR);
  const daysSinceSignup = Math.floor(hoursSinceSignup / 24);

  let daysSinceLastActivity = null;
  if (facts.lastCompletionAt) {
    daysSinceLastActivity = Math.floor((asOfMs - facts.lastCompletionAt.getTime()) / MS_PER_DAY);
  } else if (!facts.firstCompletionAt) {
    daysSinceLastActivity = daysSinceSignup;
  }

  const hasFirstSuccess = facts.firstCompletionAt !== null;
  const stagnantThresholdDays = facts.hasRoutine ? 5 : 3;
  const isStagnant = !hasFirstSuccess && daysSinceSignup >= stagnantThresholdDays;
  const hasActiveLoop = facts.currentStreakDays > 0
    || (facts.lastCompletionAt !== null
      && daysSinceLastActivity !== null
      && daysSinceLastActivity <= 2);

  return {
    isNewUser: hoursSinceSignup < 48,
    hasFirstSuccess,
    isStagnant,
    hasActiveLoop,
    hoursSinceSignup,
    daysSinceSignup,
    daysSinceLastActivity,
  };
}

module.exports = { infer };
