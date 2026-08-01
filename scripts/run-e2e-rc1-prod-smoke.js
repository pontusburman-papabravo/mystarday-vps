#!/usr/bin/env node
'use strict';

/**
 * RC-1 browser smoke against a deployed host (founder QA account — see docs/founder-qa-test-account.md).
 * Requires: RC1_SMOKE_BASE_URL, RC1_QA_EMAIL, RC1_QA_PASSWORD,
 *           RC1_CHILD_USERNAME, RC1_CHILD_PIN
 * Deprecated aliases: RC1_REVIEW_EMAIL, RC1_REVIEW_PASSWORD
 * Optional: RC1_RESTORE_LOCALE=sv-SE (default) after run
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const baseUrl = process.env.RC1_SMOKE_BASE_URL || process.env.E2E_BASE_URL;
if (!baseUrl) {
  console.log('[rc1-prod-smoke] skip — set RC1_SMOKE_BASE_URL or E2E_BASE_URL');
  process.exit(0);
}

function qaCredential(primary, legacy) {
  const value = process.env[primary] || process.env[legacy];
  if (!process.env[primary] && process.env[legacy]) {
    console.warn(`[rc1-prod-smoke] ${legacy} is deprecated; use ${primary} (founder QA — docs/founder-qa-test-account.md)`);
  }
  return value;
}

const qaEmail = qaCredential('RC1_QA_EMAIL', 'RC1_REVIEW_EMAIL');
const qaPassword = qaCredential('RC1_QA_PASSWORD', 'RC1_REVIEW_PASSWORD');
const childUsername = process.env.RC1_CHILD_USERNAME;
const childPin = process.env.RC1_CHILD_PIN;

if (!qaEmail) {
  console.error('[rc1-prod-smoke] missing RC1_QA_EMAIL (or deprecated RC1_REVIEW_EMAIL)');
  process.exit(1);
}
if (!qaPassword) {
  console.error('[rc1-prod-smoke] missing RC1_QA_PASSWORD (or deprecated RC1_REVIEW_PASSWORD)');
  process.exit(1);
}
for (const [label, value] of [
  ['RC1_CHILD_USERNAME', childUsername],
  ['RC1_CHILD_PIN', childPin],
]) {
  if (!value) {
    console.error(`[rc1-prod-smoke] missing ${label}`);
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
      RC1_QA_EMAIL: qaEmail,
      RC1_QA_PASSWORD: qaPassword,
    },
  }
);
process.exit(result.status === null ? 1 : result.status);
