#!/usr/bin/env node
'use strict';

/**
 * Family Device — disposable prod pilot (no founder secrets).
 *
 *   FAMILY_DEVICE_PILOT_CONFIRM=1 SMOKE_BASE_URL=<prod-url> npm run family-device:prod-pilot
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadEnvFile } = require('../../src/lib/load-env');

loadEnvFile();

const db = require('../../src/lib/db');
const config = require('../../src/lib/config');
const { assertProdPilotEnvironment, redactSecrets } = require('../../src/lib/family-device-pilot-guard');
const { runFamilyDeviceProdPilot } = require('./family-device-prod-pilot-core.cjs');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const baseUrl = dryRun ? process.env.SMOKE_BASE_URL || process.env.PROD_BASE : assertProdPilotEnvironment();
  if (dryRun && !baseUrl) {
    console.error('Set SMOKE_BASE_URL for --dry-run health check');
    process.exit(2);
  }

  const health = await fetch(`${baseUrl}/health`);
  const healthBody = await health.json();
  const pilotSha = healthBody.git_sha || 'unknown';

  const report = await runFamilyDeviceProdPilot({
    db,
    baseUrl,
    jwtSecret: config.jwt.secret,
    dryRun,
  });

  const out = {
    AUTOMATED_PILOT_SHA: pilotSha,
    DISPOSABLE_FAMILY_CLEANED: report.cleanup?.ok ? 'PASS' : 'FAIL',
    SHARED_ONE_CHILD_SERVER: report.scenarios?.SHARED_ONE_CHILD_SERVER || 'FAIL',
    SHARED_MULTI_CHILD_SERVER: report.scenarios?.SHARED_MULTI_CHILD_SERVER || 'FAIL',
    PARENT_DEVICE_SERVER: report.scenarios?.PARENT_DEVICE_SERVER || 'FAIL',
    CHILD_DEVICE_SERVER: report.scenarios?.CHILD_DEVICE_SERVER || 'FAIL',
    ADULT_PRIVILEGE_SERVER: report.scenarios?.ADULT_PRIVILEGE_SERVER || 'FAIL',
    REVOKE_SERVER: report.scenarios?.REVOKE_SERVER || 'FAIL',
    WRONG_CHILD: report.scenarios?.WRONG_CHILD || 'FAIL',
    DEEP_LINK: report.scenarios?.DEEP_LINK || 'FAIL',
    OFFLINE_IDENTITY: report.scenarios?.OFFLINE_IDENTITY || 'FAIL',
    WIDGET_SERVER_SCOPE: report.scenarios?.WIDGET_SERVER_SCOPE || 'FAIL',
    UNEXPECTED_5XX: report.unexpected5xx?.length || 0,
    WRONG_CHILD_WRITES: report.wrongChildWrites || 0,
    GLOBAL_FLAGS_CHANGED: report.GLOBAL_FLAGS_CHANGED || 'NO',
    FOUNDER_CREDENTIALS_USED: report.FOUNDER_CREDENTIALS_USED || 'NO',
    FAMILY_DEVICE_AUTOMATED_PROD_PILOT:
      report.ok && report.cleanup?.ok && !report.globalFlagsChanged ? 'PASS' : 'FAIL',
    adult_biometric_hardware: report.adult_biometric_hardware || 'PENDING',
    dry_run: dryRun || undefined,
  };

  console.log(JSON.stringify(out, null, 2));
  await db.pool.end();
  process.exit(out.FAMILY_DEVICE_AUTOMATED_PROD_PILOT === 'PASS' ? 0 : 1);
}

main().catch((err) => {
  console.error(redactSecrets(err.message));
  process.exit(1);
});
