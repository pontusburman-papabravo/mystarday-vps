#!/usr/bin/env node
'use strict';

/**
 * Runs browser E2E i18n smoke tests (Puppeteer + node:test).
 * Requires local Postgres (DATABASE_URL), Node 20, and merged i18n auth/locale stack (#742 + #747).
 *
 * Viewports: E2E_VIEWPORTS=desktop,mobile (default both)
 * Headed: E2E_HEADED=1
 *
 * Fails (non-zero exit) when:
 * - prerequisite i18n auth/locale files are missing on main
 * - any mandatory scenario is skipped
 * - pass count is below expected or any test fails
 */

const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const { i18nAuthStackPresent, REQUIRED_PATHS } = require('../test/e2e/helpers/prerequisites');

const ROOT = path.join(__dirname, '..');
const EXPECTED_PASS = 20;

const testFiles = [
  'test/e2e/i18n-english-journey.test.js',
  'test/e2e/i18n-login-locale-regression.test.js',
  'test/e2e/i18n-auth-failsafe.test.js',
  'test/e2e/i18n-launch-polish.test.js',
  'test/e2e/i18n-child-samling-rewards.test.js',
  'test/e2e/i18n-child-settings-reload.test.js',
  'test/e2e/i18n-child-ui-leaks.test.js',
];

if (!i18nAuthStackPresent()) {
  const missing = REQUIRED_PATHS.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
  console.error('[e2e-i18n] FATAL: i18n auth/locale stack not present — merge PR #742 + #747 to main first.');
  console.error('[e2e-i18n] Missing files:\n  - ' + missing.join('\n  - '));
  process.exit(1);
}

const env = {
  ...process.env,
  NODE_ENV: 'test', // pragma: allowlist secret
  REQUIRE_EMAIL_VERIFICATION: 'false',
  EMAIL_ENABLED: 'false', // pragma: allowlist secret
  RATE_LIMIT_ENABLED: 'false',
};

if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
  env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const args = ['--test', '--test-concurrency=1', '--test-force-exit', ...testFiles];
const result = spawnSync(process.execPath, args, {
  cwd: ROOT,
  env,
  encoding: 'utf8',
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
const summary = {
  pass: Number((combined.match(/# pass (\d+)/) || [])[1] || 0),
  skip: Number((combined.match(/# skip (\d+)/) || [])[1] || 0),
  fail: Number((combined.match(/# fail (\d+)/) || [])[1] || 0),
  tests: Number((combined.match(/# tests (\d+)/) || [])[1] || 0),
};

let exitCode = result.status === null ? 1 : result.status;

if (summary.skip > 0) {
  console.error(`[e2e-i18n] FATAL: ${summary.skip} mandatory scenario(s) skipped — CI must not pass on skips.`);
  exitCode = 1;
}

if (summary.fail > 0) {
  console.error(`[e2e-i18n] FATAL: ${summary.fail} test(s) failed.`);
  exitCode = 1;
}

if (summary.pass < EXPECTED_PASS) {
  console.error(
    `[e2e-i18n] FATAL: expected ${EXPECTED_PASS} pass, got ${summary.pass} (tests=${summary.tests}).`
  );
  exitCode = 1;
}

if (exitCode === 0) {
  console.error(`[e2e-i18n] OK: ${summary.pass} pass, ${summary.skip} skip, ${summary.fail} fail`);
}

process.exit(exitCode);
