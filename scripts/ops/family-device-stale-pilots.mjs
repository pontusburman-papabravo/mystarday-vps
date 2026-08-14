#!/usr/bin/env node
'use strict';

/**
 * Stale fd-pilot-* lifecycle — dry-run by default; --apply requires explicit latch.
 *
 *   npm run family-device:stale-pilots              # dry-run (default)
 *   FAMILY_DEVICE_PILOT_CONFIRM=1 npm run family-device:stale-pilots -- --apply
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadEnvFile } = require('../../src/lib/load-env');

loadEnvFile();

const db = require('../../src/lib/db');
const { redactSecrets } = require('../../src/lib/family-device-pilot-guard');
const { cleanupStaleFdPilotFamilies, withStalePilotLock } = require('./family-device-pilot-db.cjs');

async function main() {
  const apply = process.argv.includes('--apply');
  if (apply && process.env.FAMILY_DEVICE_PILOT_CONFIRM !== '1') {
    console.error('Refusing --apply without FAMILY_DEVICE_PILOT_CONFIRM=1');
    process.exit(2);
  }

  const lock = await withStalePilotLock(db, async () => {
    return cleanupStaleFdPilotFamilies(db, { apply });
  });

  if (!lock.locked) {
    console.error(JSON.stringify({ ok: false, code: 'STALE_PILOT_LOCK_BUSY' }, null, 2));
    process.exit(3);
  }

  const result = lock.result;
  const out = {
    mode: apply ? 'apply' : 'dry-run',
    staleFdPilotFamilies: result.families,
    staleFdPilotOverrides: result.overrides,
    deletedFamilies: result.deleted ?? 0,
    ok: apply ? result.ok === true : result.families === 0 && result.overrides === 0,
    errors: result.errors || [],
  };
  console.log(JSON.stringify(out, null, 2));
  await db.pool.end();
  process.exit(out.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(redactSecrets(err.message));
  process.exit(1);
});
