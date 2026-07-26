#!/usr/bin/env node
'use strict';

/**
 * Runs browser E2E i18n smoke tests (Puppeteer + node:test).
 * Requires local Postgres (DATABASE_URL), Node 20, and merged i18n auth/locale stack.
 *
 * Viewports: E2E_VIEWPORTS=desktop,mobile (default both)
 * Headed: E2E_HEADED=1
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const testFiles = [
  'test/e2e/i18n-english-journey.test.js',
  'test/e2e/i18n-login-locale-regression.test.js',
  'test/e2e/i18n-auth-failsafe.test.js',
];

const env = {
  ...process.env,
  NODE_ENV: 'test',
  REQUIRE_EMAIL_VERIFICATION: 'false',
  EMAIL_ENABLED: 'false',
  RATE_LIMIT_ENABLED: 'false',
};

if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
  env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const args = ['--test', '--test-concurrency=1', '--test-force-exit', ...testFiles];
const result = spawnSync(process.execPath, args, {
  cwd: ROOT,
  env,
  stdio: 'inherit',
});

process.exit(result.status === null ? 1 : result.status);
