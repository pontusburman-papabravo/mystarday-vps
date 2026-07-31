#!/usr/bin/env node
'use strict';

/**
 * RC-1 browser smoke against a deployed host (review QA account).
 *
 * Required:
 *   RC1_SMOKE_BASE_URL (or E2E_BASE_URL)
 *   RC1_REVIEW_EMAIL, RC1_REVIEW_PASSWORD
 *   RC1_CHILD_USERNAME, RC1_CHILD_PIN
 *   RC1_EXPECTED_SHA, RC1_EXPECTED_CACHE (exact release identity)
 *
 * Optional:
 *   RC1_RESTORE_LOCALE=sv-SE (default)
 *   RC1_PARENT_PIN — enables parent/child handoff describe block
 *   RC1_SMOKE_RUNS=2 — run the full file N times in sequence (flake gate)
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
  'RC1_EXPECTED_SHA',
  'RC1_EXPECTED_CACHE',
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[rc1-prod-smoke] missing ${key}`);
    process.exit(1);
  }
}

const runs = Math.max(1, Number(process.env.RC1_SMOKE_RUNS || 1));
const testFile = path.join(__dirname, '..', 'test', 'e2e', 'rc1-prod-browser-smoke.test.js');
const env = {
  ...process.env,
  E2E_BASE_URL: baseUrl,
  RC1_SMOKE_BASE_URL: baseUrl,
};

let lastStatus = 0;
for (let i = 1; i <= runs; i += 1) {
  if (runs > 1) {
    console.log(`[rc1-prod-smoke] run ${i}/${runs}`);
  }
  const result = spawnSync(process.execPath, ['--test', testFile], {
    stdio: 'inherit',
    env,
  });
  lastStatus = result.status === null ? 1 : result.status;
  if (lastStatus !== 0) {
    process.exit(lastStatus);
  }
}
process.exit(lastStatus);
