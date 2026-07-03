#!/usr/bin/env node
/**
 * generate-garden-scene.mjs — Trädgården scene-bg export (110-garden).
 *
 * Master source (first match wins):
 *   scripts/sources/garden-scene-master.png
 *   scripts/sources/garden-scene-master.jpg
 *   scripts/sources/garden-scene-master.webp
 *
 * Or pass a path: node scripts/generate-garden-scene.mjs /path/to/master.png
 *
 * Regenerate: npm run generate:garden-scene
 * After export: bump public/sw.js + config/cache-version.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIRS = [
  path.join(ROOT, 'public/images/child/world/garden'),
  path.join(ROOT, 'public/assets/worlds/garden'),
];
const SOURCE_CANDIDATES = [
  path.join(ROOT, 'scripts/sources/garden-scene-master.png'),
  path.join(ROOT, 'scripts/sources/garden-scene-master.jpg'),
  path.join(ROOT, 'scripts/sources/garden-scene-master.webp'),
];

/** Match shipped aspect ratio (860×1859). */
function heightForWidth(width) {
  return Math.round((width * 1859) / 860);
}

const EXPORTS = [
  ['scene-bg-430.webp', 430, heightForWidth(430)],
  ['scene-bg-860.webp', 860, heightForWidth(860)],
  ['scene-bg.webp', 860, heightForWidth(860)],
  ['scene-bg-1280.webp', 1280, heightForWidth(1280)],
];

function resolveMaster(argvPath) {
  if (argvPath) {
    const abs = path.isAbsolute(argvPath) ? argvPath : path.join(process.cwd(), argvPath);
    if (!fs.existsSync(abs)) {
      throw new Error('Master file not found: ' + abs);
    }
    return abs;
  }
  for (const candidate of SOURCE_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    'No garden master found. Save ChatGPT export as scripts/sources/garden-scene-master.png ' +
      '(portrait ~1080×2340) or pass a path argument.'
  );
}

function logFile(outPath, width, height) {
  const stat = fs.statSync(outPath);
  console.log('wrote', path.relative(ROOT, outPath), `${width}×${height}`, `${Math.round(stat.size / 1024)}KB`);
}

async function exportScene(masterPath) {
  const meta = await sharp(masterPath).metadata();
  console.log(
    'Using master:',
    path.relative(ROOT, masterPath),
    `${meta.width}×${meta.height}`,
    meta.format
  );

  const base = sharp(masterPath).rotate();

  for (const outDir of OUT_DIRS) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const [name, w, h] of EXPORTS) {
    const buffer = await base
      .clone()
      .resize(w, h, { fit: 'cover', position: 'centre' })
      .webp({ quality: 90, effort: 5 })
      .toBuffer();

    for (const outDir of OUT_DIRS) {
      const outPath = path.join(outDir, name);
      fs.writeFileSync(outPath, buffer);
      logFile(outPath, w, h);
    }
  }

  let total = 0;
  const canonical = OUT_DIRS[0];
  for (const [name] of EXPORTS) {
    total += fs.statSync(path.join(canonical, name)).size;
  }
  const mb = (total / (1024 * 1024)).toFixed(2);
  console.log(`Scene set total: ${mb} MB (mobile budget < 2 MB)`);
  if (total >= 2 * 1024 * 1024) {
    console.warn('WARN: scene assets exceed 2 MB mobile budget');
  }
}

async function main() {
  const masterPath = resolveMaster(process.argv[2]);
  await exportScene(masterPath);
  console.log('Garden scene-bg assets generated. Bump SW + cache-version.json before deploy.');
}

main().catch(function (err) {
  console.error(err.message || err);
  process.exit(1);
});
