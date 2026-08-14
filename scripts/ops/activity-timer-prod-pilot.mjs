#!/usr/bin/env node
'use strict';

/**
 * Activity Timer — disposable prod pilot (no founder secrets).
 *
 *   ACTIVITY_TIMER_PILOT_CONFIRM=1 SMOKE_BASE_URL=<prod-url> npm run activity-timer:prod-pilot
 */

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { loadEnvFile } = require('../../src/lib/load-env');

loadEnvFile();

const db = require('../../src/lib/db');
const { assertProdPilotEnvironment, redactSecrets } = require('../../src/lib/activity-timer-pilot-guard');
const { runActivityTimerProdPilot } = require('./activity-timer-prod-pilot-core.cjs');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const baseUrl = dryRun ? process.env.SMOKE_BASE_URL || process.env.PROD_BASE : assertProdPilotEnvironment();
  if (dryRun && !baseUrl) {
    console.error('Set SMOKE_BASE_URL for --dry-run health check');
    process.exit(2);
  }

  const health = await fetch(`${baseUrl}/health`);
  const healthBody = await health.json();
  const deployedSha = healthBody.git_sha || 'unknown';

  let report;
  try {
    report = await runActivityTimerProdPilot({
      db,
      baseUrl,
      dryRun,
    });
  } catch (err) {
    console.error('[activity-timer-prod-pilot] FAIL:', redactSecrets(err.message));
    process.exit(1);
  }

  let pilotHarnessSha = 'local';
  try {
    pilotHarnessSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    /* not a git checkout */
  }

  const out = {
    PILOT_HARNESS_SHA: pilotHarnessSha,
    DEPLOYED_SHA: deployedSha,
    FIXTURE_CREATION_METHOD: report.fixtureCreationMethod || 'db_ops',
    PUBLIC_SIGNUP_USED_FOR_FIXTURE: report.publicSignupUsedForFixture ? 'YES' : 'NO',
    FOUNDER_CREDENTIALS_USED: report.founderCredentialsUsed ? 'YES' : 'NO',
    DISPOSABLE_FAMILY_CLEANED: report.cleanup?.ok ? 'PASS' : 'FAIL',
    AUTOMATED_PILOT_OK: report.ok ? 'PASS' : 'FAIL',
    scenarios: report.scenarios,
    readback: report.readback,
  };

  console.log(JSON.stringify(out, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error('[activity-timer-prod-pilot] fatal:', redactSecrets(err.message));
  process.exit(1);
});
