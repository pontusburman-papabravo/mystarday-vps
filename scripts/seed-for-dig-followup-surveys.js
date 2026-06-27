#!/usr/bin/env node
'use strict';

/**
 * Seed 5 För dig outcome follow-up surveys (idempotent).
 * Usage: node scripts/seed-for-dig-followup-surveys.js
 */

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();
const { seedFollowupSurveys, buildFollowupSurveys } = require('../src/lib/for-dig-followup-campaign');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL saknas');
    process.exit(1);
  }

  const result = await seedFollowupSurveys();
  console.log('För dig uppföljningsenkäter:');
  for (const row of result) {
    console.log(`  ${row.slug}: ${row.action}`);
  }
  console.log(`\nLänkar (APP_URL):`);
  const base = (process.env.APP_URL || '').replace(/\/$/, '') || '(sätt APP_URL)';
  for (const s of buildFollowupSurveys()) {
    console.log(`  ${base}/tyck/${s.slug}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
