#!/usr/bin/env node
'use strict';

/**
 * Manual run: growth system help ops report (same logic as hourly scheduler).
 *
 *   npm run growth:system-help-ops-report
 *   npm run growth:system-help-ops-report -- --dry-run
 */

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();

const { runGrowthSystemHelpOpsReport } = require('../src/lib/growth-system-help-ops-report');
const db = require('../src/lib/db');

const dryRun = process.argv.includes('--dry-run');

runGrowthSystemHelpOpsReport({ dryRun })
  .then(async (result) => {
    console.log(JSON.stringify(result, null, 2));
    await db.pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[growth:system-help-ops-report]', err.message);
    try { await db.pool.end(); } catch (_) { /* ignore */ }
    process.exit(1);
  });
