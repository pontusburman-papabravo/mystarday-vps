#!/usr/bin/env node
'use strict';

/**
 * Benchmark test:gate (unit + db) and print per-file timings.
 * Usage: NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false node scripts/test-benchmark.js
 */

const { spawnSync } = require('child_process');
const path = require('path');

const REPO = path.join(__dirname, '..');
const NODE = process.execPath;

const UNIT_FILES = [
  'test/app-links-routes.test.js',
  'test/engine-golden.test.js',
  'test/engine-shadow-logic.test.js',
  'test/first-success-api.test.js',
  'test/engine-coach-authority.test.js',
  'test/journey-context.test.js',
  'test/journey-fas2.test.js',
  'test/journey-fas3.test.js',
  'test/journey-fas4.test.js',
  'test/journey-fas5.test.js',
  'test/journey-daily-analysis.test.js',
];

const DB_FILES = [
  'test/db-test-lock.test.js',
  'test/setup-test-db.test.js',
  'test/auth-integration.test.js',
  'test/child-access-integration.test.js',
  'test/maintenance-order.test.js',
  'test/journey-route-scope.test.js',
  'test/journey-golden-path.test.js',
];

function runFiles(label, files, extraArgs = []) {
  const start = Date.now();
  const result = spawnSync(NODE, ['--test', ...extraArgs, ...files], {
    cwd: REPO,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const ms = Date.now() - start;
  const ok = result.status === 0;
  return { label, ms, ok, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function main() {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';
  if (!process.env.REQUIRE_EMAIL_VERIFICATION) {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  }
  if (!process.env.TEST_SKIP_MIGRATE) {
    process.env.TEST_SKIP_MIGRATE = '1';
  }

  const totalStart = Date.now();
  const unit = runFiles('unit', UNIT_FILES, ['--test-concurrency=4']);
  const db = runFiles('db', DB_FILES, ['--test-concurrency=1']);

  console.log('\n=== test:gate benchmark ===\n');
  console.log(`unit (${UNIT_FILES.length} files, concurrency 4): ${unit.ms}ms ${unit.ok ? 'OK' : 'FAIL'}`);
  console.log(`db   (${DB_FILES.length} files, concurrency 1): ${db.ms}ms ${db.ok ? 'OK' : 'FAIL'}`);
  console.log(`total: ${Date.now() - totalStart}ms`);

  if (!unit.ok) {
    console.error('\n--- unit stderr ---\n', unit.stderr.slice(-4000));
  }
  if (!db.ok) {
    console.error('\n--- db stderr ---\n', db.stderr.slice(-4000));
  }

  process.exit(unit.ok && db.ok ? 0 : 1);
}

main();
