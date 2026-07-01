/**
 * Shared date utilities for ISO date-string arithmetic and ISO week numbers.
 *
 * Date-string functions use UTC arithmetic (midday UTC trick) to avoid DST
 * off-by-one errors. Week helpers use the standard ISO-8601 week algorithm.
 *
 * Does NOT own: database, scheduling, or business logic.
 */

const MS_PER_DAY = 86400000;

/**
 * Add (or subtract) whole days from an ISO date string.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} days - positive = forward, negative = backward
 * @returns {string} YYYY-MM-DD
 */
function addDaysIso(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Get the Monday of the week containing the given ISO date string.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string} YYYY-MM-DD of that week's Monday
 */
function getWeekMondayIso(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = dt.getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // days to go back to get Monday
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

/**
 * ISO-8601 week number for a Date (1–53).
 * @param {Date} date
 * @returns {number}
 */
function getIsoWeekNumber(date) {
  return getIsoWeekYearAndNumber(date).week;
}

/**
 * ISO-8601 week year and week number for a Date.
 * @param {Date} date
 * @returns {{ year: number, week: number }}
 */
function getIsoWeekYearAndNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / MS_PER_DAY) + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

module.exports = {
  addDaysIso,
  getWeekMondayIso,
  getIsoWeekNumber,
  getIsoWeekYearAndNumber,
};