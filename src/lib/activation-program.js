/**
 * Parent activation program — calendar/effective day logic (Luxon).
 */

const { DateTime } = require('luxon');

const PROGRAM_DURATIONS = {
  onboarding_7d: 7,
  reactivation_3d: 3,
};

function getProgramDuration(programType) {
  return PROGRAM_DURATIONS[programType] || 7;
}

/**
 * Kalenderdag från programstart (utan cap). Använd för expiry, reflektion, Day 14.
 */
function getCalendarDay(program, timezone = 'Europe/Stockholm') {
  const startLocal = DateTime.fromJSDate(new Date(program.started_at), { zone: 'utc' })
    .setZone(timezone)
    .startOf('day');
  const nowLocal = DateTime.now().setZone(timezone).startOf('day');
  const diffDays = Math.floor(nowLocal.diff(startLocal, 'days').days);
  return Math.max(diffDays + 1, 1);
}

/**
 * Programdag för innehåll (cap vid programlängd).
 */
function getEffectiveProgramDay(program, timezone = 'Europe/Stockholm') {
  const duration = getProgramDuration(program.program_type);
  return Math.min(getCalendarDay(program, timezone), duration);
}

function getExpiryDay() {
  return parseInt(process.env.ACTIVATION_PROGRAM_EXPIRY_DAY ?? '21', 10);
}

/**
 * Lazy expiry: calendar_day > expiry → status expired (endast active).
 */
function maybeExpireProgram(program, timezone = 'Europe/Stockholm') {
  if (!program || program.status !== 'active') return program;
  const calendarDay = getCalendarDay(program, timezone);
  if (calendarDay > getExpiryDay()) {
    return { ...program, status: 'expired' };
  }
  return program;
}

/**
 * Mark pending days before effectiveDay as missed (internal only).
 */
function rolloverDayStatus(dayStatus, effectiveDay) {
  const next = { ...dayStatus };
  for (let d = 1; d < effectiveDay; d++) {
    const key = String(d);
    if (!next[key] || next[key] === 'pending') {
      next[key] = 'missed';
    }
  }
  const effKey = String(effectiveDay);
  if (!next[effKey]) {
    next[effKey] = 'pending';
  }
  return next;
}

function markDayDone(dayStatus, day, trigger = 'manual') {
  const next = { ...dayStatus, [String(day)]: 'done' };
  return { dayStatus: next, trigger };
}

function isDayDone(dayStatus, day) {
  return dayStatus[String(day)] === 'done';
}

function showReflection(program, timezone = 'Europe/Stockholm') {
  if (!program) return false;
  if (program.status === 'completed' || program.status === 'opted_out') return false;
  if (program.status === 'expired') return false;
  if (program.reflection_score != null) return false;
  return getCalendarDay(program, timezone) >= 7;
}

module.exports = {
  getProgramDuration,
  getCalendarDay,
  getEffectiveProgramDay,
  getExpiryDay,
  maybeExpireProgram,
  rolloverDayStatus,
  markDayDone,
  isDayDone,
  showReflection,
};
