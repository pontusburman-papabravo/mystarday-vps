#!/usr/bin/env node
/**
 * R0-07 — consolidated mobile gate (reuses R0-01…R0-06 smokes).
 *
 * Chain (each script already runs 390×844 + 412×915):
 *   order → substeps → PIN/login→Idag → offline/sync → a11y/reduced motion/minimal_ui → support copy
 *
 * Usage:
 *   NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:r0-mobile-gate
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const STEPS = [
  { id: 'R0-01', label: 'schema order', script: 'r0-01-mobile-order-smoke.mjs' },
  { id: 'R0-02', label: 'delsteg', script: 'r0-02-mobile-substeps-smoke.mjs' },
  { id: 'R0-03', label: 'PIN/login → Idag', script: 'r0-03-child-login-today-smoke.mjs' },
  { id: 'R0-04', label: 'offline complete → sync', script: 'r0-04-child-offline-smoke.mjs' },
  { id: 'R0-05', label: 'a11y / reduced motion / minimal_ui', script: 'r0-05-child-mobile-a11y-smoke.mjs' },
  { id: 'R0-06', label: 'support diagnostics copy', script: 'r0-06-support-diagnostics-mobile-smoke.mjs' },
];

const nodeBin = process.execPath;
const env = {
  ...process.env,
  NODE_ENV: 'test',
  REQUIRE_EMAIL_VERIFICATION: 'false',
  EMAIL_ENABLED: 'false',
  RATE_LIMIT_ENABLED: 'false',
};

function runStep(step) {
  const scriptPath = path.join(ROOT, 'scripts', step.script);
  const started = Date.now();
  const result = spawnSync(nodeBin, [scriptPath], {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    encoding: 'utf8',
  });
  const durationMs = Date.now() - started;
  return {
    id: step.id,
    label: step.label,
    script: step.script,
    ok: result.status === 0,
    exitCode: result.status,
    durationMs,
    signal: result.signal || null,
  };
}

function main() {
  console.log('[r0-07-gate] R0 mobile chain — synthetic accounts only (no prod PII)\n');
  const results = [];
  for (const step of STEPS) {
    console.log(`\n[r0-07-gate] ▶ ${step.id} ${step.label} (${step.script})\n`);
    const row = runStep(step);
    results.push(row);
    if (!row.ok) {
      console.error(`\n[r0-07-gate] ✗ stopped at ${step.id} (exit ${row.exitCode})\n`);
      console.log(JSON.stringify({ step: 'r0-07-mobile-gate', results }, null, 2));
      process.exit(row.exitCode || 1);
    }
    console.log(`\n[r0-07-gate] ✓ ${step.id} (${row.durationMs}ms)\n`);
  }
  console.log(JSON.stringify({ step: 'r0-07-mobile-gate', pass: true, results }, null, 2));
  console.log('\n[r0-07-gate] PASS — R0 mobile chain green\n');
}

main();
