#!/usr/bin/env node
/**
 * lint:public with a committed warning budget (ratchet).
 *
 * - Fails if warning count > config/lint-public-budget.json
 * - `node scripts/lint-public.mjs --sync-budget` lowers the budget to the
 *   current warning count (never raises without --force-raise)
 *
 * Why: hardcoded --max-warnings in package.json drifts; agents bump features
 * and CI stays red on main, blocking auto-deploy.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUDGET_PATH = path.join(ROOT, 'config', 'lint-public-budget.json');
const TARGETS = ['public/js', 'public/admin'];

function readBudget() {
  const raw = JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8'));
  const maxWarnings = Number(raw.maxWarnings);
  if (!Number.isInteger(maxWarnings) || maxWarnings < 0) {
    throw new Error(`${BUDGET_PATH}: maxWarnings must be a non-negative integer`);
  }
  return { maxWarnings, raw };
}

function writeBudget(maxWarnings, note) {
  const payload = {
    maxWarnings,
    updatedAt: new Date().toISOString().slice(0, 10),
    note: note || 'Ratchet: lint:public warning ceiling (only lower via --sync-budget)',
  };
  fs.writeFileSync(BUDGET_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

function runEslint({ maxWarnings, jsonPath }) {
  const args = [
    'eslint',
    ...TARGETS,
    '--max-warnings',
    String(maxWarnings),
  ];
  if (jsonPath) {
    args.push('-f', 'json', '-o', jsonPath);
  }
  return spawnSync('npx', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: jsonPath ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
}

function countWarnings(jsonPath) {
  const results = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let warnings = 0;
  let errors = 0;
  for (const file of results) {
    for (const msg of file.messages || []) {
      if (msg.severity === 2) errors += 1;
      else warnings += 1;
    }
  }
  return { warnings, errors };
}

function cleanupTemp(tmpJson) {
  try { fs.unlinkSync(tmpJson); } catch { /* ignore */ }
}

function main() {
  const args = process.argv.slice(2);
  const syncBudget = args.includes('--sync-budget');
  const forceRaise = args.includes('--force-raise');
  // Note: do not expose eslint --fix here. prefer-const --fix rewrites
  // module-level `let` state that is reassigned across IIFE/extracted modules.

  const { maxWarnings } = readBudget();
  const tmpJson = path.join(ROOT, '.tmp-lint-public.json');

  // Always count with a high ceiling so we can report and sync accurately.
  const countRun = runEslint({ maxWarnings: 100000, jsonPath: tmpJson });
  if (countRun.status && countRun.status !== 0 && countRun.status !== 1) {
    process.stderr.write(countRun.stderr || '');
    cleanupTemp(tmpJson);
    process.exit(countRun.status || 1);
  }

  let warnings;
  let errors;
  try {
    ({ warnings, errors } = countWarnings(tmpJson));
  } finally {
    cleanupTemp(tmpJson);
  }

  if (errors > 0) {
    runEslint({ maxWarnings: 0 });
    console.error(`lint:public: ${errors} error(s) — fix before merge`);
    process.exit(1);
  }

  if (syncBudget) {
    if (warnings > maxWarnings && !forceRaise) {
      console.error(
        `lint:public: current warnings (${warnings}) > budget (${maxWarnings}). ` +
          'Fix warnings first, or pass --force-raise intentionally.'
      );
      process.exit(1);
    }
    if (warnings === maxWarnings) {
      console.log(`lint:public: budget already ${maxWarnings}`);
      process.exit(0);
    }
    if (warnings < maxWarnings) {
      writeBudget(warnings, `Ratcheted down from ${maxWarnings} → ${warnings}`);
      console.log(`lint:public: budget lowered ${maxWarnings} → ${warnings}`);
      process.exit(0);
    }
    writeBudget(warnings, `Budget raised from ${maxWarnings} → ${warnings} (--force-raise)`);
    console.log(`lint:public: budget raised ${maxWarnings} → ${warnings}`);
    process.exit(0);
  }

  const gated = runEslint({ maxWarnings });
  if (warnings > maxWarnings) {
    console.error(
      `\nlint:public: ${warnings} warnings exceed budget ${maxWarnings} ` +
        `(+${warnings - maxWarnings}).\n` +
        'Fix new warnings, or after a cleanup run: npm run lint:public:sync-budget\n'
    );
    process.exit(1);
  }
  if (gated.status === 0) {
    console.log(`lint:public: ${warnings}/${maxWarnings} warnings (OK)`);
  }
  process.exit(gated.status === null ? 1 : gated.status);
}

main();
