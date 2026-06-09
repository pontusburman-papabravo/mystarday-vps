/**
 * Parent activation program — calendar day logic (Luxon, timezone-safe).
 * Fas 1: pure functions only; expiry persisted lazily in GET handler (Fas 3).
 */
'use strict';

const { DateTime } = require('luxon');

const DEFAULT_TIMEZONE = 'Europe/Stockholm';
const PROGRAM_DURATION = {
  onboarding_7d: 7,
  reactivation_3d: 3,
};

function getProgramDuration(programType) {
  return PROGRAM_DURATION[programType] ?? 7;
}

function getExpiryDay() {
  return parseInt(process.env.ACTIVATION_PROGRAM_EXPIRY_DAY ?? '21', 10);
}

/**
 * Calendar day from program start (uncapped). Used for expiry and Day 14 retention.
 * @param {{ started_at: Date|string, program_type?: string }} program
 * @param {string} [timezone]
 * @returns {number} 1-based calendar day
 */
function getCalendarDay(program, timezone = DEFAULT_TIMEZONE) {
  const startLocal = DateTime.fromJSDate(new Date(program.started_at), { zone: 'utc' })
    .setZone(timezone)
    .startOf('day');
  const nowLocal = DateTime.now().setZone(timezone).startOf('day');
  const diffDays = Math.floor(nowLocal.diff(startLocal, 'days').days);
  return Math.max(diffDays + 1, 1);
}

/**
 * Content day capped at program length (7 or 3).
 * @param {{ started_at: Date|string, program_type?: string }} program
 * @param {string} [timezone]
 * @returns {number}
 */
function getEffectiveProgramDay(program, timezone = DEFAULT_TIMEZONE) {
  const duration = getProgramDuration(program.program_type);
  return Math.min(getCalendarDay(program, timezone), duration);
}

/**
 * Lazy expiry: calendar_day > EXPIRY_DAY and status active → expired (in-memory).
 * Caller persists via updateStatus when status changes.
 */
function maybeExpireProgram(program, timezone = DEFAULT_TIMEZONE) {
  const calendarDay = getCalendarDay(program, timezone);
  if (program.status === 'active' && calendarDay > getExpiryDay()) {
    return { ...program, status: 'expired' };
  }
  return program;
}

module.exports = {
  DEFAULT_TIMEZONE,
  getProgramDuration,
  getExpiryDay,
  getCalendarDay,
  getEffectiveProgramDay,
  maybeExpireProgram,
};
