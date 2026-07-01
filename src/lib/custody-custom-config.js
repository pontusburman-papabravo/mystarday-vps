'use strict';

const { getIsoWeekday } = require('./custody-schedule-engine/date-math');

const PATTERN_CUSTOM = 'custom';

const CYCLE_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const ISO_WEEKDAY_TO_KEY = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
  7: 'sun',
};

const MIN_CYCLE_WEEKS = 1;
const MAX_CYCLE_WEEKS = 4;

/**
 * @param {string} dateStr YYYY-MM-DD
 */
function isMondayAnchor(dateStr) {
  return getIsoWeekday(dateStr) === 1;
}

/**
 * @param {unknown} configuration
 * @param {Set<string>|string[]} validHomeIds
 * @returns {{ ok: true, cycleWeeks: object[], distinctHomeIds: string[] } | { ok: false, error: string }}
 */
function validateCustomConfiguration(configuration, validHomeIds) {
  const allowed = validHomeIds instanceof Set ? validHomeIds : new Set(validHomeIds);
  if (!configuration || typeof configuration !== 'object') {
    return { ok: false, error: 'configuration.cycle_weeks krävs för eget mönster' };
  }

  const cycleWeeks = configuration.cycle_weeks;
  if (!Array.isArray(cycleWeeks)) {
    return { ok: false, error: 'configuration.cycle_weeks måste vara en array' };
  }
  if (cycleWeeks.length < MIN_CYCLE_WEEKS || cycleWeeks.length > MAX_CYCLE_WEEKS) {
    return { ok: false, error: 'cycle_weeks måste innehålla 1–4 veckor' };
  }

  const distinctHomeIds = new Set();

  for (let w = 0; w < cycleWeeks.length; w += 1) {
    const week = cycleWeeks[w];
    if (!week || typeof week !== 'object') {
      return { ok: false, error: `cycle_weeks[${w}] ogiltig` };
    }
    for (const dayKey of CYCLE_DAY_KEYS) {
      const homeId = week[dayKey];
      if (!homeId || typeof homeId !== 'string') {
        return { ok: false, error: `cycle_weeks[${w}].${dayKey} krävs` };
      }
      if (!allowed.has(homeId)) {
        return { ok: false, error: 'Ogiltigt hem i cykeln' };
      }
      distinctHomeIds.add(homeId);
    }
  }

  if (distinctHomeIds.size < 2) {
    return {
      ok: false,
      error: 'Eget mönster måste ha minst två olika hem — stäng av boendeschema om barnet alltid bor på samma ställe',
    };
  }

  return {
    ok: true,
    cycleWeeks,
    distinctHomeIds: [...distinctHomeIds],
  };
}

module.exports = {
  PATTERN_CUSTOM,
  CYCLE_DAY_KEYS,
  ISO_WEEKDAY_TO_KEY,
  MIN_CYCLE_WEEKS,
  MAX_CYCLE_WEEKS,
  isMondayAnchor,
  validateCustomConfiguration,
};
