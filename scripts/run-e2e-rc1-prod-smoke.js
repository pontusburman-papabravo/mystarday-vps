#!/usr/bin/env node
'use strict';

/**
 * RC-1 browser smoke against a deployed host (review QA account).
 */
const { spawnSync, execSync } = require('node:child_process');
const path = require('node:path');

const baseUrl = process.env.RC1_SMOKE_BASE_URL || process.env.E2E_BASE_URL;
if (!baseUrl) {
  console.log('[rc1-prod-smoke] skip — set RC1_SMOKE_BASE_URL or E2E_BASE_URL');
  process.exit(0);
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
