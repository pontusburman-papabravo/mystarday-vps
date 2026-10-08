'use strict';

/**
 * Manual read-only Google Play listing audit.
 * Usage: node scripts/play-live-audit.js --out artifacts/play-live-audit.json
 * Requires GOOGLE_PLAY_SERVICE_ACCOUNT_JSON. Never prints the key or token.
 */

const fs = require('fs');
const path = require('path');
const { JWT } = require('google-auth-library');
const {
  PACKAGE_NAME,
  SCREENSHOT_COMPARISON,
  SCREENSHOT_COMPARISON_NOTE,
  SYNC_WITH_RELEASE,
  runPlayLiveAudit,
  redactValue,
} = require('../src/lib/play-live-audit');

const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function writeReport(file, report) {
  const safe = redactValue(report);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(safe, null, 2)}\n`);
}

function summaryLine(report) {
  const counts = report.summary || {};
  return [
    'play-live-audit',
    `auth=${report.auth}`,
    `match=${counts.MATCH || 0}`,
    `drift=${counts.DRIFT || 0}`,
    `missing=${counts.MISSING || 0}`,
    `unknown=${counts.UNKNOWN || 0}`,
    `forbidden=${(report.forbidden || []).length}`,
    'fi=KEEP_OPEN',
  ].join(' ');
}

async function accessToken(raw) {
  let creds;
  try {
    creds = JSON.parse(raw);
  } catch (_) {
    throw new Error('PLAY_SERVICE_ACCOUNT_INVALID');
  }
  if (!creds || typeof creds.client_email !== 'string' || typeof creds.private_key !== 'string') {
    throw new Error('PLAY_SERVICE_ACCOUNT_INVALID');
  }
  const client = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [SCOPE],
  });
  const token = await client.getAccessToken();
  if (!token || !token.token) throw new Error('PLAY_AUTH_FAILED');
  return token.token;
}

async function main() {
  if (process.argv.includes('--commit') || process.argv.includes('--write')) {
    console.error('PLAY_WRITE_LOCKED');
    process.exit(2);
  }
  const out = path.resolve(argValue('--out') || path.join('artifacts', 'play-live-audit.json'));
  const packageName = process.env.PLAY_PACKAGE_NAME || PACKAGE_NAME;
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw || !raw.trim()) {
    const report = {
      packageName,
      mode: 'read-only',
      auth: 'MISSING_SECRET',
      fiStoreAvailability: 'KEEP_OPEN',
      screenshotComparison: SCREENSHOT_COMPARISON,
      screenshotComparisonNote: SCREENSHOT_COMPARISON_NOTE,
      writes: { commit: false, listingUpdate: false, imageUpload: false, availabilityChange: false, pricing: false },
      forbidden: [],
      languages: [],
      markets: { action: 'none', status: 'UNKNOWN', fiObserved: 'UNKNOWN', restOfWorld: null, [SYNC_WITH_RELEASE]: null },
      summary: { MATCH: 0, DRIFT: 0, MISSING: 0, UNKNOWN: 0 },
    };
    writeReport(out, report);
    console.error('play-live-audit auth=MISSING_SECRET');
    process.exit(1);
  }
  try {
    const token = await accessToken(raw);
    const report = await runPlayLiveAudit({ packageName, token });
    writeReport(out, report);
    console.log(summaryLine(report));
    if (report.auth !== 'OK') process.exit(1);
  } catch (error) {
    const report = {
      packageName,
      mode: 'read-only',
      auth: 'FAILED',
      error: error && error.message ? error.message : 'PLAY_AUDIT_FAILED',
      fiStoreAvailability: 'KEEP_OPEN',
      screenshotComparison: SCREENSHOT_COMPARISON,
      screenshotComparisonNote: SCREENSHOT_COMPARISON_NOTE,
      writes: { commit: false, listingUpdate: false, imageUpload: false, availabilityChange: false, pricing: false },
      forbidden: [],
      languages: [],
      markets: { action: 'none', status: 'UNKNOWN', fiObserved: 'UNKNOWN', restOfWorld: null, [SYNC_WITH_RELEASE]: null },
      summary: { MATCH: 0, DRIFT: 0, MISSING: 0, UNKNOWN: 0 },
    };
    writeReport(out, report);
    console.error('play-live-audit auth=FAILED');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { accessToken, summaryLine };
