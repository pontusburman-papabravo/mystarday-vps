'use strict';

/**
 * Cohort clock for public signup.
 *
 * Outside the test runner, TEST_SIGNUP_NOW is ignored and the wall clock is used.
 * The test runner pins an instant after Sweden's lifetime-free cutoff
 * (2026-09-14 Europe/Stockholm) and before the Sweden trial boundary
 * (2026-10-03 00:00 Europe/Stockholm). Ordinary registration stays on the
 * intro-year side of that boundary no matter when CI runs.
 * Callers that pass an explicit `now` are unchanged. Market policy tests
 * keep covering both sides of 2026-10-03 with fixed instants.
 */

/** 2026-10-02 23:00 Europe/Stockholm (CEST, UTC+2). Still intro year. */
const TEST_SIGNUP_COHORT_ISO = '2026-10-02T21:00:00.000Z';

function readPinnedSignupInstant() {
  if (process.env.NODE_ENV !== 'test') return null;
  const raw = process.env.TEST_SIGNUP_NOW;
  if (raw == null || String(raw).trim() === '') return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Pinned cohort instant for family.created_at.
 * Null outside the test runner, and in tests that clear TEST_SIGNUP_NOW — SQL NOW() then.
 * @returns {Date|null}
 */
function signupCohortAt() {
  return readPinnedSignupInstant();
}

/**
 * Signup decision clock. Explicit opts.now still wins at the call site.
 * @returns {Date}
 */
function signupNow() {
  return readPinnedSignupInstant() || new Date();
}

module.exports = {
  TEST_SIGNUP_COHORT_ISO,
  signupCohortAt,
  signupNow,
};
