#!/usr/bin/env node
'use strict';

/**
 * Export normalized Experience Pack snapshot for golden regression tests.
 *
 * Usage:
 *   node scripts/export-experience-pack-golden.mjs
 *   node scripts/export-experience-pack-golden.mjs --check
 *   node scripts/export-experience-pack-golden.mjs --pack child_se
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { loadPack, clearPackCache } = require('../src/lib/experience-pack');

const REPO_ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const packId = args.find((arg) => !arg.startsWith('--')) || 'child_se';
const outPath = path.join(REPO_ROOT, 'test/fixtures/experience-packs', `${packId}.golden.json`);

function snapshotPack(pack) {
  return {
    pack_id: pack.manifest.pack_id,
    manifest: pack.manifest,
    progression: pack.progression,
    rewards: pack.rewards,
    copy: pack.copy,
    worlds: pack.worlds,
  };
}

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

clearPackCache();
const snapshot = snapshotPack(loadPack(packId));
const nextContent = stableStringify(snapshot);

if (checkOnly) {
  if (!fs.existsSync(outPath)) {
    console.error(`Golden fixture missing: ${outPath}`);
    process.exit(1);
  }
  const current = fs.readFileSync(outPath, 'utf8');
  if (current !== nextContent) {
    console.error(`Golden fixture drift for ${packId}: ${outPath}`);
    console.error('Run: npm run export:experience-pack-golden');
    process.exit(1);
  }
  console.log(`Golden fixture OK: ${outPath}`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, nextContent, 'utf8');
console.log(`Wrote ${outPath}`);
