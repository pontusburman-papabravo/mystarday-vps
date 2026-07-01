'use strict';

const { addDaysIso } = require('./date-math');

const TRANSITION_SCAN_DAYS = 60;

/**
 * Find next/previous dates where active home id changes.
 * @param {function(string): string|null} getHomeIdForDate
 * @param {string} dateStr
 */
function findTransitions(getHomeIdForDate, dateStr) {
  const currentId = getHomeIdForDate(dateStr);
  if (!currentId) {
    return { nextTransition: null, previousTransition: null };
  }

  let nextTransition = null;
  for (let i = 1; i <= TRANSITION_SCAN_DAYS; i += 1) {
    const d = addDaysIso(dateStr, i);
    const id = getHomeIdForDate(d);
    if (id && id !== currentId) {
      nextTransition = d;
      break;
    }
  }

  let previousTransition = null;
  for (let i = 1; i <= TRANSITION_SCAN_DAYS; i += 1) {
    const d = addDaysIso(dateStr, -i);
    const id = getHomeIdForDate(d);
    if (id && id !== currentId) {
      previousTransition = addDaysIso(d, 1);
      break;
    }
  }

  return { nextTransition, previousTransition };
}

module.exports = {
  TRANSITION_SCAN_DAYS,
  findTransitions,
};
