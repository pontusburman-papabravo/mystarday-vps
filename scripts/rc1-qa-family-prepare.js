#!/usr/bin/env node
'use strict';

/**
 * Idempotent RC-1 QA family prepare/reset (DB only — no welcome email).
 * QA/test infrastructure — not app runtime.
 *
 * Usage:
 *   npm run rc1:qa:prepare
 *   npm run rc1:qa:prepare -- --dry-run
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
} = require('./lib/rc1-qa-prepare-core');

const dryRun = process.argv.includes('--dry-run');

function sanitizePrepareError(err) {
  const msg = String(err?.message || err);
  if (/password|postgresql:|connection/i.test(msg)) {
    return '[rc1-qa-prepare] prepare failed (details redacted)';
  }
  return `[rc1-qa-prepare] ${msg}`;
}

async function main() {
  try {
    if (dryRun) {
      const qaEmail = normalizeEmail(process.env.RC1_QA_EMAIL || RC1_QA_PARENT_EMAIL);
      validatePrepareEnv(process.env, { dryRun: true });
      console.log(JSON.stringify({
        dry_run: true,
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

    const config = validatePrepareEnv(process.env, { dryRun: false });
    const client = await db.getClient();
    try {
      const result = await runRc1QaPrepareTransaction(client, config);
      console.log(JSON.stringify(result));
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
