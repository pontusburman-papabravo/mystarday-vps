'use strict';

/**
 * Shared schedule date helpers (no DB imports — safe from custody/daily-log cycles).
 */

/**
 * Get JS day-of-week (0=Sun, 1=Mon, … 6=Sat) for a date string in a timezone.
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} [timezone]
 */
function getDayOfWeek(dateStr, timezone) {
  const tz = timezone || 'Europe/Stockholm';
  const d = new Date(`${dateStr}T12:00:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const name = formatter.format(d);
  return dayNames.indexOf(name.substring(0, 3));
}

module.exports = {
  getDayOfWeek,
};
