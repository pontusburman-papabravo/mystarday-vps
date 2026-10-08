'use strict';

/**
 * Manual Google Play store listing dry-run or apply.
 * Writes only when PLAY_PUBLISH_MODE=apply and every approval gate passes.
 * Requires GOOGLE_PLAY_PUBLISHER_JSON. Never prints the key or token.
 */

const fs = require('fs');
const path = require('path');
const { JWT } = require('google-auth-library');
const { redactValue } = require('../src/lib/play-live-audit');
const { renderPlanMarkdown, runPlayStorePublish } = require('../src/lib/play-store-plan');

const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function markdownPath(file) {
  return file.endsWith('.json') ? file.replace(/\.json$/, '.md') : `${file}.md`;
}

function writeReport(file, report) {
  const safe = redactValue(report);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(safe, null, 2)}\n`);
  const markdown = renderPlanMarkdown(safe);
  fs.writeFileSync(markdownPath(file), markdown);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  return safe;
}

function summaryLine(report) {
  const changes = report.plan && Array.isArray(report.plan.changes) ? report.plan.changes.length : 0;
  return [
    'play-store-publish',
    `mode=${report.mode}`,
    `status=${report.status}`,
    `changes=${changes}`,
    `committed=${report.committed === true ? 'yes' : 'no'}`,
    'livePublicationVerified=no',
    'published=no',
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

function exitCode(report) {
  if (report.status === 'DRY_RUN' || report.status === 'NO_CHANGES' || report.status === 'COMMITTED_PENDING_REVIEW') return 0;
  if (report.status === 'APPLY_BLOCKED' || report.status === 'APPLY_BLOCKED_IN_REVIEW') return 2;
  return 1;
}

async function main() {
  if (process.argv.includes('--commit') || process.argv.includes('--write')) {
    console.error('PLAY_WRITE_LOCKED');
    process.exit(2);
  }
  const out = path.resolve(argValue('--out') || path.join('artifacts', 'play-store-plan.json'));
  const mode = process.env.PLAY_PUBLISH_MODE === 'apply' ? 'apply' : 'dry-run';
  const raw = process.env.GOOGLE_PLAY_PUBLISHER_JSON;
  if (!raw || !raw.trim()) {
    const report = writeReport(out, {
      mode,
      status: 'MISSING_SECRET',
      published: false,
      livePublicationVerified: false,
      committed: false,
      countryChange: false,
      pricingChange: false,
      trackChange: false,
      blockReason: 'missing-secret',
      plan: null,
    });
    console.error(summaryLine(report));
    process.exit(1);
  }
  try {
    const playToken = await accessToken(raw);
    const report = await runPlayStorePublish({
      mode,
      confirmation: process.env.PLAY_PUBLISH_CONFIRMATION || '',
      planSha256: process.env.PLAY_PLAN_SHA256 || '',
      locales: process.env.PLAY_LOCALES || '',
      ref: process.env.GITHUB_REF || '',
      repo: process.env.GITHUB_REPOSITORY || '',
      runId: process.env.GITHUB_RUN_ID || '',
      githubToken: process.env.GITHUB_TOKEN || '',
      playToken,
    });
    const saved = writeReport(out, report);
    const line = summaryLine(saved);
    if (exitCode(saved) === 0) console.log(line);
    else console.error(line);
    process.exit(exitCode(saved));
  } catch (error) {
    const report = writeReport(out, {
      mode,
      status: 'FAILED',
      published: false,
      livePublicationVerified: false,
      committed: false,
      countryChange: false,
      pricingChange: false,
      trackChange: false,
      blockReason: error && error.message ? error.message : 'PLAY_PUBLISH_FAILED',
      plan: null,
    });
    console.error(summaryLine(report));
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { exitCode, summaryLine };
