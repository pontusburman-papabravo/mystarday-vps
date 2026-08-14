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
const {
  cleanupStaleFdPilotFamilies,
  enumerateStalePilotCandidates,
  withFamilyDevicePilotLock,
} = require('./family-device-pilot-db.cjs');

async function main() {
  const apply = process.argv.includes('--apply');
  if (apply && process.env.FAMILY_DEVICE_PILOT_CONFIRM !== '1') {
    console.error('Refusing --apply without FAMILY_DEVICE_PILOT_CONFIRM=1');
    process.exit(2);
  }

  const lock = await withFamilyDevicePilotLock(db, async () => {
    const snapshot = await enumerateStalePilotCandidates(db);
    if (!apply) {
      return cleanupStaleFdPilotFamilies(db, { apply: false, snapshot });
    }
    return cleanupStaleFdPilotFamilies(db, { apply: true, snapshot });
  });

  if (!lock.locked) {
    console.log(JSON.stringify({ ok: false, code: 'PILOT_LOCK_BUSY', mode: apply ? 'apply' : 'dry-run' }, null, 2));
    await db.pool.end();
    process.exit(3);
  }

  const result = lock.result;
  const out = {
    mode: result.mode,
    ok: result.ok === true,
    candidates: result.candidates || [],
    refused: result.refused || [],
    ambiguous: result.ambiguous || [],
    candidateCount: result.candidateCount ?? (result.candidates || []).length,
    refusedCount: result.refusedCount ?? (result.refused || []).length,
    ambiguousCount: result.ambiguousCount ?? (result.ambiguous || []).length,
    deletedFamilyIds: result.deletedFamilyIds || [],
    deletedCount: result.deletedCount ?? (result.deletedFamilyIds || []).length,
    staleFdPilotFamilies: result.staleFdPilotFamilies ?? null,
    staleFdPilotOverrides: result.staleFdPilotOverrides ?? null,
    blocker: result.blocker || null,
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
