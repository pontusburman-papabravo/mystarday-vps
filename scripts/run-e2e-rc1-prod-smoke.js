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

const requireHandoff = process.env.RC1_REQUIRE_HANDOFF !== 'false'
  && process.env.RC1_REQUIRE_HANDOFF !== '0';

if (!requireHandoff) {
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

const runs = Math.max(1, Number(process.env.RC1_SMOKE_RUNS || 1));
const expectedTests = requireHandoff ? 5 : 4;
const pacingMs = Number(process.env.RC1_SMOKE_PACING_MS || 8000);
const testFile = path.join(__dirname, '..', 'test', 'e2e', 'rc1-prod-browser-smoke.test.js');

function parseTapSummary(output) {
  const tests = output.match(/^# tests (\d+)/m);
  const pass = output.match(/^# pass (\d+)/m);
  const fail = output.match(/^# fail (\d+)/m);
  const skip = output.match(/^# skip (\d+)/m);
  return {
    tests: tests ? Number(tests[1]) : null,
    pass: pass ? Number(pass[1]) : null,
    fail: fail ? Number(fail[1]) : null,
    skip: skip ? Number(skip[1]) : null,
  };
}

let total429 = 0;

function count429FromOutput(output) {
  if (!output) return 0;
  let sum = 0;
  for (const m of output.matchAll(/429_count=(\d+)/g)) {
    sum += Number(m[1]);
  }
  return sum;
}

function runOnce(runIndex) {
  const result = spawnSync(
    process.execPath,
    ['--test', '--test-reporter', 'tap', testFile],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        E2E_BASE_URL: baseUrl,
        RC1_SMOKE_BASE_URL: baseUrl,
        RC1_REQUIRE_HANDOFF: requireHandoff ? 'true' : 'false',
      },
    }
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  total429 += count429FromOutput(`${result.stdout || ''}${result.stderr || ''}`);

  const summary = parseTapSummary(result.stdout || '');
  const okExit = result.status === 0;
  const countsOk = summary.tests === expectedTests
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

if (requireHandoff) {
  console.log('[rc1-prod-smoke] release gate: 5/5 OK for all runs');
} else {
  console.log('[rc1-prod-smoke] LIMITED SMOKE complete (4 tests) — NOT READY FOR DEVICE QA');
}
console.log(`[rc1-prod-smoke] observed_429_total=${total429}`);
process.exit(0);
