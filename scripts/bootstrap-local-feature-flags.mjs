#!/usr/bin/env node
/**
 * Explicit local/test repair for missing feature_flag rows.
 * Requires validated disposable TEST_DATABASE_URL — fail closed.
 *
 *   TEST_DATABASE_URL=postgresql://.../stjarndag_test TEST_DB_DESTRUCTIVE_CONFIRM=1 npm run bootstrap:local-feature-flags
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const { loadEnvFile } = require('../src/lib/load-env.js');
loadEnvFile();

const {
  assertRepairAllowed,
  repairMissingFeatureFlagSeeds,
} = require('./lib/pre-public-release-gate/local-flag-repair.cjs');

async function main() {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  assertRepairAllowed(databaseUrl, process.env);
  const result = await repairMissingFeatureFlagSeeds(databaseUrl, { env: process.env });
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((err) => {
  if (err.code === 'REPAIR_REFUSED') {
    console.error('[bootstrap-local-feature-flags] REFUSED:', err.message);
    process.exit(2);
  }
  console.error('[bootstrap-local-feature-flags] fatal:', err.message);
  process.exit(1);
});
