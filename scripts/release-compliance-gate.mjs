#!/usr/bin/env node
/**
 * Release Compliance Gate — Apple App Store & Google Play policy, legal,
 * and submission-metadata readiness.
 *
 *   npm run release:compliance
 *   npm run release:compliance -- --json
 *
 * This script is Gate B (Store Policy & Legal Compliance) + Gate C
 * (Submission Metadata & Review Package) from docs/release/RELEASE_GATE_MODEL.md.
 *
 * Gate A (Technical Release Readiness) is the EXISTING `npm run
 * release:pre-public-gate` script — this script does not duplicate it. It
 * only reads that gate's last JSON output (artifacts/pre-public-release-gate.json)
 * for cross-reference if present.
 *
 * IMPORTANT: this script never changes payment flags, market gates, or
 * native capabilities, and it never mutates the database. It only reads
 * repo files.
 *
 * Exit codes:
 *   0 = automated checks pass, but manual App Store Connect / Play Console
 *       checks may remain. This is NEVER equivalent to "ready for App Review".
 *   1 = hard compliance failure — at least one automated check FAILed.
 *   2 = script/config error — the gate itself could not run.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { jsonStdout: false, jsonOut: path.join(ROOT, 'artifacts/release-compliance-gate.json'), help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') out.jsonStdout = true;
    else if (a === '--json-out') out.jsonOut = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`
release:compliance — Apple App Store / Google Play policy + legal + submission-metadata gate

  npm run release:compliance
  npm run release:compliance -- --json
  npm run release:compliance -- --json-out path/to/file.json

This is Gate B + Gate C. Run \`npm run release:pre-public-gate\` separately for
Gate A (technical release readiness). Neither gate alone is "ready for App Review" —
see docs/release/RELEASE_GATE_MODEL.md and docs/release/STORE_SUBMISSION_CHECKLIST.md.

Policy changes over time. This gate encodes structural checks, not the current
text of Apple/Google policy — verify docs/release/STORE_POLICY_SOURCES.md
against the live policy pages before every production submission.

Exit: 0 automated-PASS-manual-may-remain · 1 hard FAIL · 2 script/config error
`);
}

function getCurrentHeadSha() {
  try {
    const { execSync } = require('node:child_process');
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function loadGateAReference() {
  const jsonPath = path.join(ROOT, 'artifacts/pre-public-release-gate.json');
  if (!fs.existsSync(jsonPath)) {
    return {
      status: 'NOT_VERIFIED',
      note: 'Gate A: NOT_VERIFIED — no artifacts/pre-public-release-gate.json found. Run `npm run release:pre-public-gate` before relying on CODE READY.',
    };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const currentSha = getCurrentHeadSha();
    const decision = parsed.decision || parsed.overallStatus || 'unknown';
    const artifactSha = parsed.candidateSha || null;
    const shaMismatch = artifactSha && currentSha && artifactSha !== currentSha;
    const isBlockerArtifact = /^BLOCKER/i.test(String(decision));
    const isStale = isBlockerArtifact || shaMismatch || !parsed.generatedAt;

    if (isStale) {
      const contextParts = [
        `prior decision: ${decision}`,
        artifactSha ? `artifact SHA: ${artifactSha.slice(0, 12)}` : null,
        currentSha ? `current HEAD: ${currentSha.slice(0, 12)}` : null,
      ].filter(Boolean);
      return {
        status: 'NOT_VERIFIED',
        note: `Gate A: NOT_VERIFIED (cached result stale / unsuitable execution environment). ${contextParts.join('; ')}. Re-run \`npm run release:pre-public-gate\` on a fresh checkout to verify CODE READY.`,
        priorArtifact: {
          decision,
          candidateSha: artifactSha,
          generatedAt: parsed.generatedAt || null,
        },
      };
    }

    return {
      status: parsed.overallStatus === 'PASS' || decision === 'PASS' ? 'PASS' : 'NOT_VERIFIED',
      note: `Gate A loaded from artifacts/pre-public-release-gate.json (generated ${parsed.generatedAt}, decision: ${decision}).`,
      candidateSha: artifactSha,
    };
  } catch (err) {
    return {
      status: 'NOT_VERIFIED',
      note: `Gate A: NOT_VERIFIED — could not parse artifacts/pre-public-release-gate.json: ${err.message}`,
    };
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const { EXIT } = require('./lib/release-compliance/constants.cjs');

  let sections;
  try {
    const { runPreReleaseLanguageScan } = require('./lib/release-compliance/check-language-scan.cjs');
    const { runLegalUrlChecks } = require('./lib/release-compliance/check-legal-urls.cjs');
    const { runPlaceholderScan } = require('./lib/release-compliance/check-placeholder-scan.cjs');
    const { runMarketConsistencyChecks } = require('./lib/release-compliance/check-market-consistency.cjs');
    const { runLaunchReadyMarketChecks } = require('./lib/release-compliance/check-launch-ready-markets.cjs');
    const { runAuthReviewAccessChecks } = require('./lib/release-compliance/check-auth-review-access.cjs');
    const { runAccountDeletionChecks } = require('./lib/release-compliance/check-account-deletion.cjs');
    const { runIapChecks } = require('./lib/release-compliance/check-iap.cjs');
    const { runTrackingPrivacyChecks } = require('./lib/release-compliance/check-tracking-privacy.cjs');
    const { runVersionBuildCacheChecks } = require('./lib/release-compliance/check-version-build-cache.cjs');
    const { runSubmissionMetadataChecks } = require('./lib/release-compliance/check-submission-metadata.cjs');

    sections = [
      runPreReleaseLanguageScan(ROOT),
      runLegalUrlChecks(ROOT),
      runPlaceholderScan(ROOT),
      runMarketConsistencyChecks(ROOT),
      runLaunchReadyMarketChecks(ROOT),
      runAuthReviewAccessChecks(ROOT),
      runAccountDeletionChecks(ROOT),
      runIapChecks(ROOT),
      runTrackingPrivacyChecks(ROOT),
      runVersionBuildCacheChecks(ROOT),
      runSubmissionMetadataChecks(ROOT),
    ];
  } catch (err) {
    console.error(`[release-compliance-gate] script/config error: ${err.stack || err.message}`);
    process.exit(EXIT.SCRIPT_ERROR);
    return;
  }

  const { buildReport, humanSummary } = require('./lib/release-compliance/report.cjs');
  const report = buildReport({ sections, gateAReference: loadGateAReference() });

  fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true });
  fs.writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`);

  if (args.jsonStdout) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${humanSummary(report)}\n`);
    process.stdout.write(`\nJSON written to ${args.jsonOut}\n`);
  }

  process.exit(report.exitCode);
}

main().catch((err) => {
  console.error('[release-compliance-gate] fatal:', err.stack || err.message);
  process.exit(2);
});
