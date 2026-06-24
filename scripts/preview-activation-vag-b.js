#!/usr/bin/env node
/**
 * Preview väg B — families eligible for 7d activation program email.
 * Usage: node scripts/preview-activation-vag-b.js
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();

const {
  isActivationEmailEnabled,
  isPostLaunchEnrollment,
} = require('../src/lib/activation-program-enroll');
const { fetchEligibleParents } = require('../src/lib/activation-program-email-scheduler');

async function main() {
  console.log('=== Väg B preview (7d-program via e-post) ===');
  console.log('ACTIVATION_PROGRAM_ENABLED:', process.env.ACTIVATION_PROGRAM_ENABLED ?? '(unset)');
  console.log('ACTIVATION_PROGRAM_EMAIL_ENABLED:', process.env.ACTIVATION_PROGRAM_EMAIL_ENABLED ?? '(unset)');
  console.log('EMAIL_ENABLED:', process.env.EMAIL_ENABLED ?? '(unset, default on)');
  console.log('Post-launch:', isPostLaunchEnrollment());
  console.log('Email path active:', isActivationEmailEnabled());
  console.log('');

  if (!isActivationEmailEnabled()) {
    console.log('Väg B är AV — sätt ACTIVATION_PROGRAM_EMAIL_ENABLED=true i .env och starta om.');
    process.exit(0);
  }

  const parents = await fetchEligibleParents();
  console.log(`Eligible nu (max 1 mejl/familj, 30d cooldown): ${parents.length}`);
  if (parents.length > 0) {
    const sample = parents.slice(0, 10);
    for (const row of sample) {
      console.log(`  - ${row.email} (${row.parent_name || '—'}, barn: ${row.child_name || '—'})`);
    }
    if (parents.length > 10) {
      console.log(`  … och ${parents.length - 10} till`);
    }
  }
  console.log('');
  console.log('Schemalagt: dagligen vid midnatt (Europe/Stockholm) efter omstart.');
  const db = require('../src/lib/db');
  await db.pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
