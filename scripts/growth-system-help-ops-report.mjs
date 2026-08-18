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

const dryRun = process.argv.includes('--dry-run');

runGrowthSystemHelpOpsReport({ dryRun })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error('[growth:system-help-ops-report]', err.message);
    process.exit(1);
  });
