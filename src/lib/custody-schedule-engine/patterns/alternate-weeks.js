'use strict';

const { getWeekMondayIso, addDaysIso, getBiweeklyPhase } = require('../date-math');
const { resolveHomeRecord } = require('../homes');

/**
 * @param {object} schedule
 * @returns {{ homeAId: string, homeBId: string }}
 */
function homeIdsFromSchedule(schedule) {
  const config = schedule.configuration || {};
  const homeAId = config.home_a || schedule.week_a_home_id;
  const homeBId = config.home_b || schedule.week_b_home_id;
  if (!homeAId || !homeBId) {
    throw new Error('alternate_weeks saknar home_a/home_b');
  }
  return { homeAId, homeBId };
}

/**
 * @param {object} schedule
 * @param {Record<string, object>} homesById
 * @param {string} dateStr
 */
function resolveAlternateWeeks(schedule, homesById, dateStr) {
  const { homeAId, homeBId } = homeIdsFromSchedule(schedule);
  const phase = getBiweeklyPhase(schedule.anchor_date, dateStr, schedule.interval_weeks ?? 2);
  const homeId = phase === 0 ? homeAId : homeBId;
  const monday = getWeekMondayIso(dateStr);
  const sunday = addDaysIso(monday, 6);

  return {
    activeHome: resolveHomeRecord(homeId, homesById),
    patternType: 'alternate_weeks',
    activePeriod: { start: monday, end: sunday },
  };
}

module.exports = {
  resolveAlternateWeeks,
  homeIdsFromSchedule,
};
