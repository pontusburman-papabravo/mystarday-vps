'use strict';

/**
 * Dry-run store sync. --write is recognized and refused before any store call.
 * Market availability is a separate flag and is never performed here.
 *
 * Usage: node scripts/store-sync.js --dry-run
 */

const {
  appleCredentialGaps,
  googleCredentialGaps,
  buildReport,
  fillDrift,
  nativeBinaryReport,
  parseSyncArgs,
  assertSyncMode,
  buildSyncPlan,
  formatSyncPlan,
} = require('../src/lib/store-live-parity');
const { readAppleInventory, readGoogleInventory } = require('../src/lib/store-connect-read');

async function readOrBlocked(label, missing, reader) {
  if (missing.length) {
    return { accessible: false, missingCredentials: missing, error: `${label} credentials missing` };
  }
  try {
    return await reader();
  } catch (error) {
    return { accessible: false, missingCredentials: [], error: `${label} read failed: ${error.message}` };
  }
}

async function main() {
  const args = parseSyncArgs(process.argv.slice(2));
  assertSyncMode(args);
  const apple = await readOrBlocked('Apple', appleCredentialGaps(), () => readAppleInventory());
  const google = await readOrBlocked('Google', googleCredentialGaps(), () => readGoogleInventory());
  const report = fillDrift(buildReport({ apple, google, native: nativeBinaryReport() }));
  const plan = buildSyncPlan(report, args);
  process.stdout.write(`${formatSyncPlan(plan)}\n`);
  process.stdout.write('\nAPPLE WRITE PERFORMED: NO\nGOOGLE WRITE PERFORMED: NO\nGOOGLE EDIT COMMITTED: NO\nMARKET ACTIVATION PERFORMED: NO\n');
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(error.code === 'STORE_WRITE_LOCKED' || error.code === 'STORE_SYNC_MODE_REQUIRED' ? 2 : 1);
});
