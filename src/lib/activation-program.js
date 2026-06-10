/**
 * Parent activation program — day logic (Luxon, family timezone).
 * Invariants: docs/activation-program-invariants.md
 */

const { DateTime } = require('luxon');

const DEFAULT_TIMEZONE = 'Europe/Stockholm';
const DEFAULT_EXPIRY_DAY = 21;

function getProgramDuration(programType) {
  return programType === 'reactivation_3d' ? 3 : 7;
}

function toUtcDateTime(value) {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value, { zone: 'utc' });
  }
  if (typeof value === 'string') {
    return DateTime.fromISO(value, { zone: 'utc' });
  }
  return DateTime.fromISO(String(value), { zone: 'utc' });
}

/**
 * Calendar day from program start (uncapped). Used for expiry and Day 14 retention.
 */
function getCalendarDay(program, timezone = DEFAULT_TIMEZONE) {
  const tz = timezone || DEFAULT_TIMEZONE;
  const startLocal = toUtcDateTime(program.started_at).setZone(tz).startOf('day');
  const nowLocal = DateTime.now().setZone(tz).startOf('day');
  const diffDays = Math.floor(nowLocal.diff(startLocal, 'days').days);
  return Math.max(diffDays + 1, 1);
}

/**
 * Effective program day for banner/push content (capped at program length).
 */
function getEffectiveProgramDay(program, timezone = DEFAULT_TIMEZONE) {
  const duration = getProgramDuration(program.program_type);
  return Math.min(getCalendarDay(program, timezone), duration);
}

function getExpiryDay() {
  const parsed = parseInt(process.env.ACTIVATION_PROGRAM_EXPIRY_DAY ?? String(DEFAULT_EXPIRY_DAY), 10);
  return Number.isFinite(parsed) ? parsed : DEFAULT_EXPIRY_DAY;
}

/**
 * Lazy expiry: calendar_day > EXPIRY_DAY and status active → expired.
 */
function maybeExpireProgram(program, timezone = DEFAULT_TIMEZONE) {
  const calendarDay = getCalendarDay(program, timezone);
  if (program.status === 'active' && calendarDay > getExpiryDay()) {
    return { ...program, status: 'expired' };
  }
  return program;
}

/**
 * Invariant #4 — banner only for active treatment arm.
 */
function shouldShowBanner(program) {
  return program.status === 'active' && program.cohort_arm === 'treatment';
}

/**
 * Invariant #6 — control arm never receives treatment UI.
 */
function isControlArm(program) {
  return program.cohort_arm === 'control';
}

/**
 * Mark pending days before effectiveDay as missed (internal only — invariant #14).
 */
function rolloverDayStatus(dayStatus, effectiveDay) {
  const next = { ...(dayStatus || {}) };
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

function markDayDone(dayStatus, day, _trigger = 'manual') {
  return { dayStatus: { ...(dayStatus || {}), [String(day)]: 'done' }, trigger: _trigger };
}

function isDayDone(dayStatus, day) {
  return (dayStatus || {})[String(day)] === 'done';
}

/**
 * Reflection window: calendar_day >= 7 until submitted or terminal status.
 */
function showReflection(program, timezone = DEFAULT_TIMEZONE) {
  if (!program) return false;
  if (program.status === 'completed' || program.status === 'opted_out') return false;
  if (program.status === 'expired') return false;
  if (program.reflection_score != null) return false;
  return getCalendarDay(program, timezone) >= 7;
}

module.exports = {
  DEFAULT_TIMEZONE,
  DEFAULT_EXPIRY_DAY,
  getProgramDuration,
  getCalendarDay,
  getEffectiveProgramDay,
  getExpiryDay,
  maybeExpireProgram,
  shouldShowBanner,
  isControlArm,
  rolloverDayStatus,
  markDayDone,
  isDayDone,
  showReflection,
};
