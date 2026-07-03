'use strict';

/** Server helpers — aktivitetstimer spec v0.3 */

const MIN_DURATION_SECONDS = 5;
const MAX_DURATION_SECONDS = 3600;

/**
 * @param {unknown} value
 * @returns {number|null|undefined} null = disabled; undefined = invalid
 */
function normalizeDurationSeconds(value) {
  if (value === null || value === '') return null;
  if (value === undefined) return undefined;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return undefined;
  if (n < MIN_DURATION_SECONDS || n > MAX_DURATION_SECONDS) return undefined;
  return n;
}

/** @param {number|null|undefined} durationSeconds */
function isTimerConfigured(durationSeconds) {
  return durationSeconds != null && durationSeconds >= MIN_DURATION_SECONDS;
}

module.exports = {
  MIN_DURATION_SECONDS,
  MAX_DURATION_SECONDS,
  normalizeDurationSeconds,
  isTimerConfigured,
};
