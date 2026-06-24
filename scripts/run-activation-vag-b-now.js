#!/usr/bin/env node
/**
 * Run väg B email job once (same logic as midnight scheduler).
 * Usage:
 *   node scripts/run-activation-vag-b-now.js --dry-run   # preview only
 *   node scripts/run-activation-vag-b-now.js             # send for real
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();

const { isActivationEmailEnabled } = require('../src/lib/activation-program-enroll');
const {
  fetchEligibleParents,
  runActivationEmailJob,
} = require('../src/lib/activation-program-email-scheduler');

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!isActivationEmailEnabled()) {
    console.error('[vag-b] ACTIVATION_PROGRAM_EMAIL_ENABLED är inte true — avbryter.');
    process.exit(1);
  }

  if (dryRun) {
    const parents = await fetchEligibleParents();
    console.log(`[vag-b] DRY RUN — skulle skicka ${parents.length} mejl`);
    for (const row of parents) {
      console.log(`  ${row.email}`);
    }
    const db = require('../src/lib/db');
    await db.pool.end();
    return;
  }

  console.log('[vag-b] Kör utskick …');
  await runActivationEmailJob();
  const db = require('../src/lib/db');
  await db.pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[vag-b]', err);
    process.exit(1);
  });
