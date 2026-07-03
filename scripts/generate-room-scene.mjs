#!/usr/bin/env node
/**
 * generate-room-scene.mjs — Generic Living World scene-bg export (docs/world catalog).
 *
 * Usage:
 *   node scripts/generate-room-scene.mjs bedroom
 *   node scripts/generate-room-scene.mjs hall --master /path/to/custom.png
 *   node scripts/generate-room-scene.mjs --all
 *
 * Master source (first match wins):
 *   scripts/sources/{slug}-scene-master-high.png
 *   scripts/sources/{slug}-scene-master.png | .jpg | .webp
 *   scripts/sources/{slug}-scene-master-broad.png (landscape, center-cropped)
 *
 * Garden (110) uses scripts/generate-garden-scene.mjs — not this script.
 *
 * Regenerate: npm run generate:room-scene -- bedroom
 *             npm run generate:room-scenes
 * After export: bump public/sw.js + config/cache-version.json
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  ROOM_SLUGS,
  EXPORTABLE_SLUGS,
  exportRoomScene,
  exportAllRooms,
  parseArgv,
  resolveMaster,
} = require('./room-scene-export-lib.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

async function main() {
  const { all, slugs, masterPath } = parseArgv(process.argv);

  if (all) {
    const results = await exportAllRooms(ROOT);
    const ok = results.filter(function (r) { return r.ok; });
    const fail = results.filter(function (r) { return !r.ok; });
    console.log('\nExported ' + ok.length + '/' + EXPORTABLE_SLUGS.length + ' rooms.');
    if (fail.length) {
      console.warn('Skipped:', fail.map(function (r) { return r.slug; }).join(', '));
    }
    console.log('Bump SW + config/cache-version.json before deploy.');
    return;
  }

  const slug = slugs[0];
  if (!slug) {
    throw new Error(
      'Usage: node scripts/generate-room-scene.mjs <slug> [--master path] | --all\n' +
        'Slugs: ' + ROOM_SLUGS.join(', ')
    );
  }
  if (slug === 'garden') {
    throw new Error('Garden uses npm run generate:garden-scene (legacy dual-path export).');
  }
  if (!ROOM_SLUGS.includes(slug)) {
    throw new Error('Unknown slug "' + slug + '". Valid: ' + ROOM_SLUGS.join(', '));
  }

  const master = resolveMaster(ROOT, slug, masterPath);
  await exportRoomScene(slug, master, { root: ROOT });
  console.log(slug + ' scene-bg assets generated. Bump SW + cache-version.json before deploy.');
}

main().catch(function (err) {
  console.error(err.message || err);
  process.exit(1);
});
