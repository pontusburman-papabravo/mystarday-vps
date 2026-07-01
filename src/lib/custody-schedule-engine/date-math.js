'use strict';

const { getWeekMondayIso, addDaysIso } = require('../date-utils');

/**
 * ISO weekday: 1 = Monday … 7 = Sunday.
 * @param {string} dateStr YYYY-MM-DD
 */
function getIsoWeekday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

/**
 * Calendar weeks between two Monday ISO dates (can be negative).
 * @param {string} anchorMonday
 * @param {string} dateMonday
 */
function diffCalendarWeeks(anchorMonday, dateMonday) {
  const [ay, am, ad] = anchorMonday.split('-').map(Number);
  const [by, bm, bd] = dateMonday.split('-').map(Number);
  const a = Date.UTC(ay, am - 1, ad, 12, 0, 0);
  const b = Date.UTC(by, bm - 1, bd, 12, 0, 0);
  return Math.floor((b - a) / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Bi-weekly phase: 0 = A-block, 1 = B-block (for 2-week interval).
 * @param {string} anchorDate
 * @param {string} dateStr
 * @param {number} [intervalWeeks]
 */
function getBiweeklyPhase(anchorDate, dateStr, intervalWeeks = 2) {
  const anchorMonday = getWeekMondayIso(anchorDate);
  const dateMonday = getWeekMondayIso(dateStr);
  const weeksSince = diffCalendarWeeks(anchorMonday, dateMonday);
  const interval = intervalWeeks ?? 2;
  return ((weeksSince % interval) + interval) % interval;
}

module.exports = {
  getWeekMondayIso,
  addDaysIso,
  getIsoWeekday,
  diffCalendarWeeks,
  getBiweeklyPhase,
};
