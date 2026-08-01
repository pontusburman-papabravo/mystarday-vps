#!/usr/bin/env node
'use strict';

/**
 * RC-1 browser smoke — dedicated QA fixture (docs/rc1-qa-fixture.md).
 * Requires: RC1_SMOKE_BASE_URL, RC1_QA_*, RC1_EXPECTED_SHA, RC1_EXPECTED_CACHE, RC1_QA_FAMILY_ID
 * Optional: RC1_RUN_QA_PREP=1 runs scripts/rc1-qa-family-prepare.js before smoke (needs DATABASE_URL)
 */
const { spawnSync, execSync } = require('node:child_process');
const path = require('node:path');
const { pinFingerprintsMatch } = require('../src/lib/rc1-pin-fingerprint');
const { RC1_QA_PARENT_EMAIL, RC1_QA_CHILD_USERNAME, isAllowedRc1QaParentEmail } = require('../src/lib/rc1-qa-fixture');

const baseUrl = process.env.RC1_SMOKE_BASE_URL || process.env.E2E_BASE_URL;
if (!baseUrl) {
  console.log('[rc1-prod-smoke] skip — set RC1_SMOKE_BASE_URL or E2E_BASE_URL');
  process.exit(0);
}

function qaCredential(primary, legacy) {
  const value = process.env[primary] || process.env[legacy];
  if (!process.env[primary] && process.env[legacy]) {
    console.warn(`[rc1-prod-smoke] ${legacy} is deprecated; use ${primary}`);
  }
  return value;
}

const qaEmail = qaCredential('RC1_QA_EMAIL', 'RC1_REVIEW_EMAIL');
const qaPassword = qaCredential('RC1_QA_PASSWORD', 'RC1_REVIEW_PASSWORD');
const useQaFixture = process.env.RC1_USE_QA_FIXTURE !== '0';

if (useQaFixture && qaEmail && !isAllowedRc1QaParentEmail(qaEmail)) {
  console.error('[rc1-prod-smoke] RC1_QA_EMAIL is not an allowlisted RC-1 QA fixture (refusing founder/review accounts)');
  process.exit(1);
}
if (useQaFixture && !process.env.RC1_QA_FAMILY_ID) {
  console.error('[rc1-prod-smoke] missing RC1_QA_FAMILY_ID (required for RC-1 QA fixture)');
  process.exit(1);
}

if (process.env.RC1_RUN_QA_PREP === '1') {
  if (!process.env.DATABASE_URL) {
    console.error('[rc1-prod-smoke] RC1_RUN_QA_PREP=1 requires DATABASE_URL');
    process.exit(1);
  }
  console.log('[rc1-prod-smoke] running rc1-qa-family-prepare…');
  const prepScript = path.join(__dirname, 'rc1-qa-family-prepare.js');
  const prep = spawnSync(process.execPath, [prepScript], {
    encoding: 'utf8',
    env: {
      ...process.env,
      RC1_QA_EMAIL: qaEmail || RC1_QA_PARENT_EMAIL,
    },
  });
  if (prep.stdout) process.stdout.write(prep.stdout);
  if (prep.stderr) process.stderr.write(prep.stderr);
  if (prep.status !== 0) {
    console.error('[rc1-prod-smoke] QA prepare failed');
    process.exit(prep.status || 1);
  }
  try {
    const lines = prep.stdout.trim().split('\n').filter(Boolean);
    const prepOut = JSON.parse(lines[lines.length - 1]);
    if (prepOut.family_id) {
      process.env.RC1_QA_FAMILY_ID = prepOut.family_id;
    }
    const fpMatch = pinFingerprintsMatch(
      process.env.RC1_PARENT_PIN,
      process.env.RC1_PIN_FINGERPRINT_KEY,
      prepOut.pin_fingerprint
    );
    console.log(`[rc1-prod-smoke] prep_pin_fingerprint_matches_runner=${fpMatch === true}`);
    if (fpMatch === false) {
      console.error('[rc1-prod-smoke] QA_FIXTURE_OR_SECRET_INJECTION_FAILURE: PIN fingerprint mismatch');
      process.exit(1);
    }
  } catch (err) {
    console.error('[rc1-prod-smoke] could not parse prepare output');
    process.exit(1);
  }
}

const smokeFilter = (process.env.RC1_SMOKE_FILTER || '').trim().toLowerCase();
const handoffDebugOnly = smokeFilter === 'handoff';

const requireHandoff = !handoffDebugOnly
  && process.env.RC1_REQUIRE_HANDOFF !== 'false'
  && process.env.RC1_REQUIRE_HANDOFF !== '0';

if (handoffDebugOnly) {
  console.warn('[rc1-prod-smoke] RC1_SMOKE_FILTER=handoff — LIMITED HANDOFF DEBUG — NOT RELEASE GATE');
} else if (!requireHandoff) {
  console.warn('[rc1-prod-smoke] LIMITED SMOKE — HANDOFF NOT RUN — NOT READY FOR DEVICE QA');
} else if (!process.env.RC1_PARENT_PIN) {
  console.error('[rc1-prod-smoke] missing RC1_PARENT_PIN (RC1_REQUIRE_HANDOFF=true)');
  process.exit(1);
}

if (!qaEmail) {
  console.error('[rc1-prod-smoke] missing RC1_QA_EMAIL');
  process.exit(1);
}
if (!qaPassword) {
  console.error('[rc1-prod-smoke] missing RC1_QA_PASSWORD');
  process.exit(1);
}

if (!process.env.RC1_CHILD_USERNAME && useQaFixture) {
  process.env.RC1_CHILD_USERNAME = RC1_QA_CHILD_USERNAME;
}

const required = [
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

const handoffDebugRuns = handoffDebugOnly
  ? Math.max(1, Number(process.env.RC1_HANDOFF_DEBUG_RUNS || 3))
  : 1;
const runs = handoffDebugOnly
  ? handoffDebugRuns
  : Math.max(1, Number(process.env.RC1_SMOKE_RUNS || 1));
const expectedTests = handoffDebugOnly ? 2 : (requireHandoff ? 5 : 4);
const pacingMs = Number(process.env.RC1_SMOKE_PACING_MS || 90000);
const testFile = path.join(__dirname, '..', 'test', 'e2e', 'rc1-prod-browser-smoke.test.js');
const initialCooldownMs = Number(process.env.RC1_SMOKE_INITIAL_COOLDOWN_MS || 0);

function parseTapSummary(output) {
  const tests = output.match(/^# tests (\d+)/m);
  const pass = output.match(/^# pass (\d+)/m);
  const fail = output.match(/^# fail (\d+)/m);
  const skip = output.match(/^# skip (\d+)/m);
  return {
    tests: tests ? Number(tests[1]) : null,
    pass: pass ? Number(pass[1]) : null,
    fail: fail ? Number(fail[1]) : null,
    skip: skip ? Number(skip[1]) : 0,
  };
}

let total429 = 0;
let handoff429 = 0;

function count429FromOutput(output) {
  if (!output) return 0;
  let sum = 0;
  for (const m of output.matchAll(/429_count=(\d+)/g)) {
    sum += Number(m[1]);
  }
  return sum;
}

function countHandoff429(output) {
  if (!output) return 0;
  let sum = 0;
  for (const m of output.matchAll(/verify-pin-picker returned 429|logout returned 429/gi)) {
    sum += 1;
    void m;
  }
  return sum;
}

if (initialCooldownMs > 0) {
  console.log(`[rc1-prod-smoke] initial cooldown ${initialCooldownMs}ms before first suite`);
  execSync(`sleep ${Math.ceil(initialCooldownMs / 1000)}`);
}

function runOnce(runIndex) {
  const testArgs = handoffDebugOnly
    ? ['--test', '--test-reporter', 'tap', '--test-name-pattern', 'release identity|parent → child', testFile]
    : ['--test', '--test-reporter', 'tap', testFile];
  const result = spawnSync(
    process.execPath,
    testArgs,
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        E2E_BASE_URL: baseUrl,
        RC1_SMOKE_BASE_URL: baseUrl,
        RC1_QA_EMAIL: qaEmail,
        RC1_QA_PASSWORD: qaPassword,
        RC1_REVIEW_EMAIL: qaEmail,
        RC1_REVIEW_PASSWORD: qaPassword,
        RC1_REQUIRE_HANDOFF: requireHandoff || handoffDebugOnly ? 'true' : 'false',
        RC1_SMOKE_FILTER: smokeFilter || '',
      },
    }
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const blob = `${result.stdout || ''}${result.stderr || ''}`;
  total429 += count429FromOutput(blob);
  handoff429 += countHandoff429(blob);

  const summary = parseTapSummary(result.stdout || '');
  const okExit = result.status === 0;
  const passRequired = handoffDebugOnly ? 2 : expectedTests;
  const countsOk = handoffDebugOnly
    ? summary.fail === 0 && summary.pass === passRequired
    : summary.tests === expectedTests
      && summary.pass === expectedTests
      && summary.fail === 0
      && summary.skip === 0;

  if (!countsOk || !okExit) {
    console.error(
      `[rc1-prod-smoke] run ${runIndex} summary mismatch: expected tests=${expectedTests} pass=${expectedTests} fail=0 skip=0; `
      + `got tests=${summary.tests} pass=${summary.pass} fail=${summary.fail} skip=${summary.skip}`
    );
    process.exit(result.status === null ? 1 : result.status || 1);
  }
  console.log(`[rc1-prod-smoke] run ${runIndex}: tests=${summary.tests} pass=${summary.pass} fail=0 skip=0`);
  return summary;
}

for (let i = 1; i <= runs; i += 1) {
  if (runs > 1) {
    console.log(`[rc1-prod-smoke] full suite ${i}/${runs}`);
  }
  runOnce(i);
  if (i < runs && pacingMs > 0) {
    console.log(`[rc1-prod-smoke] pacing ${pacingMs}ms before next suite`);
    execSync(`sleep ${Math.ceil(pacingMs / 1000)}`);
  }
}

if (handoffDebugOnly) {
  console.log(`[rc1-prod-smoke] handoff debug: ${runs}/${runs} OK (not release gate)`);
} else if (requireHandoff) {
  console.log('[rc1-prod-smoke] release gate: 5/5 OK for all runs');
} else {
  console.log('[rc1-prod-smoke] LIMITED SMOKE complete (4 tests) — NOT READY FOR DEVICE QA');
}
console.log(`[rc1-prod-smoke] observed_reports_429_total=${total429}`);
console.log(`[rc1-prod-smoke] observed_handoff_429_signals=${handoff429}`);
process.exit(0);
