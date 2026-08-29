#!/usr/bin/env node
/**
 * L6 — Manual store delta generator over canonical checklist.
 *
 *   npm run release:store-delta
 *   npm run release:store-delta -- --profile apple --native-release
 *   npm run release:store-delta -- --paths ios/App public/js/paywall.js --json
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectChangedFiles } from './lib/test-routing/changed-files.mjs';
import {
  formatStoreManualDelta,
  generateStoreManualDelta,
} from './lib/store-manual-delta/generate.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = {
    json: false,
    profile: 'both',
    base: 'origin/main',
    paths: [],
    nativeRelease: false,
    gateA: undefined,
    gateBC: undefined,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') out.json = true;
    else if (a === '--profile') out.profile = argv[++i];
    else if (a === '--base') out.base = argv[++i];
    else if (a === '--paths') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) out.paths.push(argv[++i]);
    } else if (a === '--native-release') out.nativeRelease = true;
    else if (a === '--gate-a') out.gateA = argv[++i];
    else if (a === '--gate-bc') out.gateBC = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`
release:store-delta — L6 manual store actions (filtered from STORE_SUBMISSION_CHECKLIST.md)

  npm run release:store-delta
  npm run release:store-delta -- --profile apple
  npm run release:store-delta -- --native-release --json
  npm run release:store-delta -- --paths ios/App public/js/iap-manager.js

Unknown changed paths → MANUAL_REVIEW_REQUIRED (never auto-PASS).
Full checklist remains canonical in docs/release/STORE_SUBMISSION_CHECKLIST.md.
`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const changedPaths = args.paths.length
    ? args.paths
    : collectChangedFiles(ROOT, { baseRef: args.base, staged: true, unstaged: true });

  const delta = generateStoreManualDelta(ROOT, {
    changedPaths,
    profile: args.profile,
    nativeRelease: args.nativeRelease,
    gateAPath: args.gateA,
    gateBCPath: args.gateBC,
  });

  if (args.json) {
    console.log(JSON.stringify(delta, null, 2));
  } else {
    console.log(formatStoreManualDelta(delta));
  }

  process.exit(0);
}

main();
