'use strict';

const {
  STARTER_PLAN_PACKAGES,
  AGE_BAND_RANGES,
  ACTIVITY_LIMITS,
} = require('../../../config/starter-plan-meta');

function ageBandMidpoint(ageBand) {
  const range = AGE_BAND_RANGES[ageBand];
  if (!range) return 7;
  return (range[0] + range[1]) / 2;
}

function scorePackage(pkg, input) {
  let score = 0;
  if (pkg.routineType === input.routineType) score += 10;
  const age = ageBandMidpoint(input.ageBand);
  if (age >= pkg.ageMin && age <= pkg.ageMax) score += 5;
  if (input.supportLevel === 'high' && pkg.supportLevel === 'high') score += 3;
  if (input.supportLevel === 'low' && pkg.supportLevel === 'low') score += 2;
  if (pkg.defaultLength === input.desiredLength) score += 2;
  return score;
}

/**
 * @param {object} input
 * @param {string} input.ageBand
 * @param {string} input.routineType
 * @param {'low'|'medium'|'high'} input.supportLevel
 * @param {'short'|'normal'|'detailed'} input.desiredLength
 */
function selectStarterTemplate(input) {
  const sorted = [...STARTER_PLAN_PACKAGES].sort((a, b) => {
    const diff = scorePackage(b, input) - scorePackage(a, input);
    if (diff !== 0) return diff;
    return a.slug.localeCompare(b.slug);
  });
  const best = sorted[0] || STARTER_PLAN_PACKAGES[0];
  const limits = ACTIVITY_LIMITS[input.desiredLength] || ACTIVITY_LIMITS.normal;
  return {
    slug: best.slug,
    scheduleName: best.scheduleName,
    routineType: best.routineType,
    maxActivities: limits.max,
    targetActivities: limits.default,
  };
}

/**
 * Truncate activity list to plan limits (D10).
 * @param {Array<{name: string}>} items
 * @param {'short'|'normal'|'detailed'} desiredLength
 */
function enforceActivityCount(items, desiredLength = 'normal') {
  const limits = ACTIVITY_LIMITS[desiredLength] || ACTIVITY_LIMITS.normal;
  const max = limits.max;
  if (!Array.isArray(items)) return [];
  return items.slice(0, max);
}

module.exports = {
  selectStarterTemplate,
  enforceActivityCount,
  scorePackage,
};
