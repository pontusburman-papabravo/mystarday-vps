#!/usr/bin/env node
'use strict';

/**
 * RC-1 browser smoke against a deployed host (review QA account).
 * Requires: RC1_SMOKE_BASE_URL, RC1_REVIEW_EMAIL, RC1_REVIEW_PASSWORD,
 *           RC1_CHILD_USERNAME, RC1_CHILD_PIN
 * Optional: RC1_RESTORE_LOCALE=sv-SE (default) after run
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const baseUrl = process.env.RC1_SMOKE_BASE_URL || process.env.E2E_BASE_URL;
if (!baseUrl) {
  console.log('[rc1-prod-smoke] skip — set RC1_SMOKE_BASE_URL or E2E_BASE_URL');
  process.exit(0);
}

const required = [
  'RC1_REVIEW_EMAIL',
  'RC1_REVIEW_PASSWORD',
  'RC1_CHILD_USERNAME',
  'RC1_CHILD_PIN',
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[rc1-prod-smoke] missing ${key}`);
    process.exit(1);
  }
}

const testFile = path.join(__dirname, '..', 'test', 'e2e', 'rc1-prod-browser-smoke.test.js');
const result = spawnSync(
  process.execPath,
  ['--test', testFile],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      E2E_BASE_URL: baseUrl,
    },
  }
);
process.exit(result.status === null ? 1 : result.status);
