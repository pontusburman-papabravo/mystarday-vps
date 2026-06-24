'use strict';

const { getWeekMondayIso } = require('./date-utils');

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
 * @param {object} pattern — anchor_date, interval_weeks
 * @param {string} dateStr — YYYY-MM-DD
 * @returns {'a'|'b'}
 */
function getWeekVariantForDate(pattern, dateStr) {
  const interval = pattern.interval_weeks ?? 2;
  const anchorMonday = getWeekMondayIso(pattern.anchor_date);
  const dateMonday = getWeekMondayIso(dateStr);
  const weeksSince = diffCalendarWeeks(anchorMonday, dateMonday);
  const pos = ((weeksSince % interval) + interval) % interval;
  return pos === 0 ? 'a' : 'b';
}

/**
 * @param {object} pattern
 * @param {Map<string, object>|Record<string, object>} homesById — id → { label, color }
 * @param {string} dateStr
 */
function getHomeForDate(pattern, homesById, dateStr) {
  const variant = getWeekVariantForDate(pattern, dateStr);
  const homeId = variant === 'a' ? pattern.week_a_home_id : pattern.week_b_home_id;
  const home = homesById instanceof Map ? homesById.get(homeId) : homesById[homeId];
  return {
    variant,
    homeId,
    label: home?.label || (variant === 'a' ? 'Vecka A' : 'Vecka B'),
    color: home?.color || '#4F46E5',
  };
}

/**
 * Banner copy for the week containing dateStr.
 * @param {object} pattern
 * @param {Map<string, object>|Record<string, object>} homesById
 * @param {string} dateStr
 */
function getWeekBannerContext(pattern, homesById, dateStr) {
  const monday = getWeekMondayIso(dateStr);
  return getHomeForDate(pattern, homesById, monday);
}

/**
 * @param {string|null} parentHomeId
 * @param {object} pattern
 * @param {string} dateStr
 */
function isParentCustodyDay(parentHomeId, pattern, dateStr) {
  if (!parentHomeId || !pattern) return false;
  const { homeId } = getHomeForDate(pattern, {
    [pattern.week_a_home_id]: { id: pattern.week_a_home_id },
    [pattern.week_b_home_id]: { id: pattern.week_b_home_id },
  }, dateStr);
  return homeId === parentHomeId;
}

module.exports = {
  diffCalendarWeeks,
  getWeekVariantForDate,
  getHomeForDate,
  getWeekBannerContext,
  isParentCustodyDay,
};
