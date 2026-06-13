'use strict';

/**
 * Whether a scheduled activity should trigger a reminder on this cron tick.
 * Fires once per activity: only in the 5-minute slot ending at lead_minutes before start.
 */
function shouldSendScheduleReminder(itemTimeMin, currentTimeMin, leadMin) {
  const minsUntil = itemTimeMin - currentTimeMin;
  if (minsUntil <= 0 || minsUntil > leadMin) return false;
  // Cron runs every 5 min — restrict to one slot: (leadMin-5, leadMin].
  return minsUntil > leadMin - 5;
}

module.exports = { shouldSendScheduleReminder };
