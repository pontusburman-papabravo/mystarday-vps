#!/usr/bin/env node
/**
 * List families stuck in onboarding (registered 48h–14d ago, onboarding incomplete).
 *
 * Usage:
 *   node scripts/activation-stuck-report.js
 *   node scripts/activation-stuck-report.js --json
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();

const stuckFamiliesDb = require('../db/activation-stuck-families');

async function main() {
  const asJson = process.argv.includes('--json');
  const families = await stuckFamiliesDb.listStuckFamilies();

  if (asJson) {
    console.log(JSON.stringify({ count: families.length, families }, null, 2));
    return;
  }

  console.log(`Fastnade familjer (48h–14d, ej slutförd onboarding): ${families.length}\n`);
  for (const f of families) {
    console.log([
      f.createdAt?.toISOString?.().slice(0, 10) || f.createdAt,
      f.stuckReason,
      `children=${f.childCount}`,
      `variant=${f.activationVariant}`,
      f.familyName,
    ].join(' · '));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[activation-stuck-report]', err);
    process.exit(1);
  });
