#!/usr/bin/env node
'use strict';

/**
 * Idempotent RC-1 QA family prepare/reset (DB only — no welcome email).
 * QA/test infrastructure — not app runtime.
 *
 * Usage:
 *   RC1_PREPARE_MODE=apply npm run rc1:qa:prepare
 *   RC1_PREPARE_MODE=dry-run npm run rc1:qa:prepare
 *   npm run rc1:qa:prepare:dry-run  (legacy: no DB, plan only)
 */

const db = require('../src/lib/db');
const {
  RC1_QA_PARENT_EMAIL,
  RC1_QA_CHILD_USERNAME,
  normalizeEmail,
} = require('../test/support/rc1-qa-fixture');
const {
  validatePrepareEnv,
  runRc1QaPrepareTransaction,
  runRc1QaPrepareDryRunInspect,
} = require('./lib/rc1-qa-prepare-core');

function resolvePrepareMode(argv, env) {
  const fromEnv = (env.RC1_PREPARE_MODE || '').trim().toLowerCase();
  if (fromEnv === 'none' || fromEnv === 'dry-run' || fromEnv === 'apply') {
    return fromEnv;
  }
  if (argv.includes('--dry-run')) {
    return 'legacy-cli-dry-run';
  }
  return 'apply';
}

function sanitizePrepareError(err) {
  const msg = String(err?.message || err);
  if (/password|postgresql:|connection/i.test(msg)) {
    return '[rc1-qa-prepare] prepare failed (details redacted)';
  }
  return `[rc1-qa-prepare] ${msg}`;
}

async function main() {
  const mode = resolvePrepareMode(process.argv, process.env);
  try {
    if (mode === 'none') {
      console.log(JSON.stringify({
        prepare_mode: 'none',
        skipped: true,
        child_username: RC1_QA_CHILD_USERNAME,
      }));
      return;
    }

    if (mode === 'legacy-cli-dry-run') {
      const qaEmail = normalizeEmail(process.env.RC1_QA_EMAIL || RC1_QA_PARENT_EMAIL);
      validatePrepareEnv(process.env, { dryRun: true });
      console.log(JSON.stringify({
        dry_run: true,
        prepare_mode: 'legacy-cli-dry-run',
        note: 'No database access — use RC1_PREPARE_MODE=dry-run for DB inspection dry-run',
        actions: [
          'upsert QA family by allowlisted email only',
          'set en-GB locale + english_app + english_child_experience',
          'ensure lifetime_free subscription without reporting component',
          'set parent password hash + parent app-lock PIN hash',
          'set child username/PIN',
          'wipe per rc1-qa-reset-manifest and reseed minimal schedule/rewards/today log',
          'clear handoff rows + refresh tokens + child pin lockout for QA family',
          'verify parent PIN in transaction before COMMIT',
        ],
        qa_email_domain: qaEmail.split('@')[1],
        child_username: RC1_QA_CHILD_USERNAME,
      }));
      return;
    }

    if (mode === 'dry-run') {
      const config = validatePrepareEnv(process.env, { dryRun: false });
      const client = await db.getClient();
      try {
        const result = await runRc1QaPrepareDryRunInspect(client, config);
        console.log(JSON.stringify(result));
      } finally {
        client.release();
        await db.pool.end().catch(() => {});
      }
      return;
    }

    const config = validatePrepareEnv(process.env, { dryRun: false });
    const client = await db.getClient();
    try {
      const result = await runRc1QaPrepareTransaction(client, config);
      console.log(JSON.stringify({ ...result, prepare_mode: 'apply' }));
    } finally {
      client.release();
      await db.pool.end().catch(() => {});
    }
  } catch (err) {
    console.error(sanitizePrepareError(err));
    process.exitCode = 1;
  }
  process.exit(process.exitCode || 0);
}

main();
