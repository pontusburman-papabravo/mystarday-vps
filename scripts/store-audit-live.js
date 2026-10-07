'use strict';

/**
 * Read-only parity audit: repo catalog vs App Store Connect vs Google Play.
 * Usage: node scripts/store-audit-live.js
 */

const fs = require('fs');
const path = require('path');
const {
  appleCredentialGaps,
  googleCredentialGaps,
  buildReport,
  fillDrift,
  nativeBinaryReport,
  formatSummary,
} = require('../src/lib/store-live-parity');
const { readAppleInventory, readGoogleInventory } = require('../src/lib/store-connect-read');

async function readOrBlocked(label, missing, reader) {
  if (missing.length) {
    return { accessible: false, missingCredentials: missing, error: `${label} credentials missing` };
  }
  try {
    return await reader();
  } catch (error) {
    return {
      accessible: false,
      missingCredentials: [],
      error: `${label} read failed: ${error.message}`,
    };
  }
}

async function main() {
  const apple = await readOrBlocked('Apple', appleCredentialGaps(), () => readAppleInventory());
  const google = await readOrBlocked('Google', googleCredentialGaps(), () => readGoogleInventory());
  const report = fillDrift(buildReport({
    apple,
    google,
    native: nativeBinaryReport(),
  }));
  const outDir = path.join(__dirname, '..', 'artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'store-live-parity.json');
  fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
  const mirror = '/opt/cursor/artifacts';
  if (fs.existsSync(mirror)) {
    fs.writeFileSync(path.join(mirror, 'store-live-parity.json'), `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write(`${formatSummary(report)}\n`);
  process.stdout.write(`\nWrote ${outFile}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
