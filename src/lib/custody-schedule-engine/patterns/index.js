'use strict';

const { PATTERN_ALTERNATE_WEEKS, PATTERN_ALTERNATE_WEEKENDS } = require('../../../../db/custody');
const { resolveAlternateWeeks } = require('./alternate-weeks');
const { resolveAlternateWeekends } = require('./alternate-weekends');

/** @type {Record<string, { resolve: Function }>} */
const PATTERN_MODULES = {
  [PATTERN_ALTERNATE_WEEKS]: { resolve: resolveAlternateWeeks },
  [PATTERN_ALTERNATE_WEEKENDS]: { resolve: resolveAlternateWeekends },
};

/**
 * @param {object} schedule
 * @param {Record<string, object>} homesById
 * @param {string} dateStr
 */
function resolvePattern(schedule, homesById, dateStr) {
  const patternType = schedule.pattern_type || PATTERN_ALTERNATE_WEEKS;
  const mod = PATTERN_MODULES[patternType];
  if (!mod) {
    throw new Error(`Okänt pattern_type: ${patternType}`);
  }
  return mod.resolve(schedule, homesById, dateStr);
}

module.exports = {
  PATTERN_MODULES,
  resolvePattern,
};
