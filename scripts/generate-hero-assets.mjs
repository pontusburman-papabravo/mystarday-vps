#!/usr/bin/env node
/**
 * generate-hero-assets.mjs — Export hero detail layers from scripts/sources/*-hero-*.png
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { exportHeroAsset } = require('./hero-asset-export-lib.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SOURCES = path.join(ROOT, 'scripts/sources');

/** [assetDir, heroObjectName] — matches scripts/sources/{dir}-hero-{name}.png */
const HERO_CATALOG = [
  ['bedroom', 'bed'],
  ['hall', 'fireplace'],
  ['kitchen', 'table'],
  ['attic', 'trunk'],
  ['pet-house', 'bed'],
  ['reading-corner', 'lamp'],
  ['forest', 'pine'],
  ['lake', 'dock'],
  ['memory-hall', 'wall'],
];

function discoverHeroes() {
  const found = [];
  for (const file of fs.readdirSync(SOURCES)) {
    const match = file.match(/^(.+)-hero-(.+)\.png$/);
    if (!match) continue;
    found.push([match[1], match[2]]);
  }
  return found;
}

async function main() {
  const entries = process.argv.includes('--discover') ? discoverHeroes() : HERO_CATALOG;
  let ok = 0;
  for (const [dir, objectName] of entries) {
    try {
      console.log('\n=== ' + dir + ' / ' + objectName + ' ===');
      await exportHeroAsset(dir, objectName, { root: ROOT });
      ok += 1;
    } catch (err) {
      console.warn('SKIP', dir, objectName + ':', err.message);
    }
  }
  console.log('\nExported ' + ok + '/' + entries.length + ' hero sets.');
}

main().catch(function (err) {
  console.error(err.message || err);
  process.exit(1);
});
