'use strict';

const {
  getWeekMondayIso,
  addDaysIso,
  getIsoWeekday,
  diffCalendarWeeks,
} = require('../date-math');
const { resolveHomeRecord } = require('../homes');
const { CYCLE_DAY_KEYS, ISO_WEEKDAY_TO_KEY } = require('../../custody-custom-config');

const MAX_ACTIVE_PERIOD_SCAN_DAYS = 28;

/**
 * @param {object} schedule
 * @returns {object[]}
 */
function cycleWeeksFromSchedule(schedule) {
  const weeks = schedule.configuration?.cycle_weeks;
  if (!Array.isArray(weeks) || weeks.length < 1) {
    throw new Error('custom saknar configuration.cycle_weeks');
  }
  return weeks;
}

/**
 * @param {object} schedule
 * @param {string} dateStr
 */
function homeIdForDate(schedule, dateStr) {
  const cycleWeeks = cycleWeeksFromSchedule(schedule);
  const anchorMonday = getWeekMondayIso(schedule.anchor_date);
  const dateMonday = getWeekMondayIso(dateStr);
  const weeksSince = diffCalendarWeeks(anchorMonday, dateMonday);
  const cycleLen = cycleWeeks.length;
  const cycleIndex = ((weeksSince % cycleLen) + cycleLen) % cycleLen;
  const dayKey = ISO_WEEKDAY_TO_KEY[getIsoWeekday(dateStr)];
  const homeId = cycleWeeks[cycleIndex][dayKey];
  if (!homeId) {
    throw new Error(`custom saknar hem för ${dayKey} i cykelvecka ${cycleIndex + 1}`);
  }
  return homeId;
}

/**
 * Contiguous run of the same home around dateStr within the repeating cycle.
 * @param {object} schedule
 * @param {string} dateStr
 */
function activePeriodForDate(schedule, dateStr) {
  const homeId = homeIdForDate(schedule, dateStr);
  let start = dateStr;
  let end = dateStr;

  for (let i = 1; i <= MAX_ACTIVE_PERIOD_SCAN_DAYS; i += 1) {
    const prev = addDaysIso(start, -1);
    if (homeIdForDate(schedule, prev) !== homeId) break;
    start = prev;
  }
  for (let i = 1; i <= MAX_ACTIVE_PERIOD_SCAN_DAYS; i += 1) {
    const next = addDaysIso(end, 1);
    if (homeIdForDate(schedule, next) !== homeId) break;
    end = next;
  }

  return { start, end };
}

/**
 * @param {object} schedule
 * @param {Record<string, object>} homesById
 * @param {string} dateStr
 */
function resolveCustom(schedule, homesById, dateStr) {
  const homeId = homeIdForDate(schedule, dateStr);
  const activePeriod = activePeriodForDate(schedule, dateStr);

  return {
    activeHome: resolveHomeRecord(homeId, homesById),
    patternType: 'custom',
    activePeriod,
  };
}

module.exports = {
  resolveCustom,
  homeIdForDate,
  activePeriodForDate,
  cycleWeeksFromSchedule,
  CYCLE_DAY_KEYS,
};
