'use strict';

/**
 * Test runner preload — map validated TEST_DATABASE_URL to DATABASE_URL for app code.
 * Requires TEST_DATABASE_URL + TEST_DB_DESTRUCTIVE_CONFIRM (fail closed).
 */
const { buildDestructiveTestChildEnv, REFUSED_CODE } = require('../../scripts/lib/test-database-safety.cjs');
const { TEST_SIGNUP_COHORT_ISO } = require('../../src/lib/signup-clock');

try {
  Object.assign(process.env, buildDestructiveTestChildEnv(process.env));
  process.env.RATE_LIMIT_ENABLED = 'false';
  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  // Keep registerAndLogin on the pre-2026-10-03 Sweden intro-year cohort.
  // A test that needs another instant sets TEST_SIGNUP_NOW itself.
  if (!process.env.TEST_SIGNUP_NOW) {
    process.env.TEST_SIGNUP_NOW = TEST_SIGNUP_COHORT_ISO;
  }
} catch (err) {
  console.error(`[test-database-safety] ${err.code || REFUSED_CODE}: ${err.message}`);
  process.exit(1);
}
