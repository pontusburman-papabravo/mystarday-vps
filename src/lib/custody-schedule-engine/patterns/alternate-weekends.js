'use strict';

const { getWeekMondayIso, addDaysIso, getIsoWeekday, getBiweeklyPhase } = require('../date-math');
const { resolveHomeRecord } = require('../homes');

/**
 * @param {object} schedule
 */
function configFromSchedule(schedule) {
  const config = schedule.configuration || {};
  const defaultHomeId = config.default_home;
  const weekendAId = config.weekend_home_a || schedule.week_a_home_id;
  const weekendBId = config.weekend_home_b || schedule.week_b_home_id;

  if (!defaultHomeId || !weekendAId || !weekendBId) {
    throw new Error('alternate_weekends saknar default_home och weekend_home_a/b');
  }

  return { defaultHomeId, weekendAId, weekendBId };
}

/**
 * @param {object} schedule
 * @param {Record<string, object>} homesById
 * @param {string} dateStr
 */
function resolveAlternateWeekends(schedule, homesById, dateStr) {
  const { defaultHomeId, weekendAId, weekendBId } = configFromSchedule(schedule);
  const weekday = getIsoWeekday(dateStr);
  const monday = getWeekMondayIso(dateStr);

  if (weekday <= 4) {
    const thursday = addDaysIso(monday, 3);
    return {
      activeHome: resolveHomeRecord(defaultHomeId, homesById),
      patternType: 'alternate_weekends',
      activePeriod: { start: monday, end: thursday },
    };
  }

  const phase = getBiweeklyPhase(schedule.anchor_date, dateStr, schedule.interval_weeks ?? 2);
  const homeId = phase === 0 ? weekendAId : weekendBId;
  const friday = addDaysIso(monday, 4);
  const sunday = addDaysIso(monday, 6);

  return {
    activeHome: resolveHomeRecord(homeId, homesById),
    patternType: 'alternate_weekends',
    activePeriod: { start: friday, end: sunday },
  };
}

module.exports = {
  resolveAlternateWeekends,
  configFromSchedule,
};
