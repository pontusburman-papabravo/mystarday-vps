#!/usr/bin/env node
/**
 * generate-memory-hall-scene.mjs — Minnesrummet scene export (BL-041).
 * Prefers memory-hall-scene-master-high.png; falls back to v2; then procedural SVG.
 *
 * Regenerate: npm run generate:memory-hall-scene
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { exportRoomScene, resolveMaster, SCENE_EXPORTS } = require('./room-scene-export-lib.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/images/child/world/memory-hall');

const MASTER_CANDIDATES = [
  path.join(ROOT, 'scripts/sources/memory-hall-scene-master-high.png'),
  path.join(ROOT, 'scripts/sources/memory-hall-scene-v2.png'),
];

/** Art spec palette (procedural fallback) */
const COLORS = {
  cream: '#f7f0e4',
  creamMid: '#efe6d8',
  creamDeep: '#dcc9b0',
  amber: '#e8c9a0',
  amberLight: '#fff8dc',
  wood: '#c4a882',
  woodDark: '#a8845a',
};

function memoryHallSceneSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="860" height="1859" viewBox="0 0 860 1859">
  <defs>
    <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.cream}"/>
      <stop offset="55%" stop-color="${COLORS.creamMid}"/>
      <stop offset="100%" stop-color="${COLORS.creamDeep}"/>
    </linearGradient>
    <radialGradient id="windowGlow" cx="72%" cy="18%" r="45%">
      <stop offset="0%" stop-color="${COLORS.amberLight}" stop-opacity="0.85"/>
      <stop offset="45%" stop-color="${COLORS.amber}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${COLORS.amber}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="860" height="1859" fill="url(#wallGrad)"/>
  <rect width="860" height="1859" fill="url(#windowGlow)"/>
</svg>`;
}

function frameSvg(glow) {
  const inner = glow
    ? `<rect x="10" y="10" width="100" height="100" rx="6" fill="${COLORS.amberLight}" opacity="0.4"/>
       <rect x="16" y="16" width="88" height="88" rx="4" fill="${COLORS.cream}"/>`
    : `<rect x="16" y="16" width="88" height="88" rx="4" fill="${COLORS.creamMid}"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <rect x="6" y="6" width="108" height="108" rx="8" fill="${COLORS.cream}" stroke="${COLORS.woodDark}" stroke-width="5"/>
  ${inner}
</svg>`;
}

async function writeWebpFromSvg(sharp, svg, outPath, width, height) {
  let pipeline = sharp(Buffer.from(svg), { density: 144 });
  if (width && height) pipeline = pipeline.resize(width, height, { fit: 'cover' });
  await pipeline.webp({ quality: 90, effort: 4 }).toFile(outPath);
}

function logFile(outPath, width, height) {
  const stat = fs.statSync(outPath);
  console.log('wrote', path.relative(ROOT, outPath), `${width}×${height}`, `${Math.round(stat.size / 1024)}KB`);
}

/** Map garden-style exports to memory-hall legacy filenames. */
const MEMORY_HALL_FILE_MAP = {
  'scene-bg-430.webp': 'scene-430.webp',
  'scene-bg-860.webp': 'scene-860.webp',
  'scene-bg.webp': 'scene@2x.webp',
  'scene-bg-1280.webp': 'scene-1280.webp',
};

async function exportSceneFromMaster(masterPath) {
  const tempSlug = 'memory-hall-export-temp';
  const tempDir = path.join(ROOT, 'public/images/child/world', tempSlug);
  await exportRoomScene(tempSlug, masterPath, { root: ROOT, log: false });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [srcName, destName] of Object.entries(MEMORY_HALL_FILE_MAP)) {
    const src = path.join(tempDir, srcName);
    const dest = path.join(OUT_DIR, destName);
    fs.copyFileSync(src, dest);
    const meta = SCENE_EXPORTS.find(function (e) { return e[0] === srcName; });
    logFile(dest, meta[1], meta[2]);
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
}

async function exportSceneFromSvg(sharp) {
  const sceneSvg = memoryHallSceneSvg();
  const exports = [
    ['scene@2x.webp', 860, 1859],
    ['scene-860.webp', 860, 1859],
    ['scene-430.webp', 430, 930],
    ['scene-1280.webp', 1280, 2767],
  ];
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, w, h] of exports) {
    await writeWebpFromSvg(sharp, sceneSvg, path.join(OUT_DIR, name), w, h);
    logFile(path.join(OUT_DIR, name), w, h);
  }
}

async function exportFrames(sharp) {
  await writeWebpFromSvg(sharp, frameSvg(false), path.join(OUT_DIR, 'frame-empty@2x.webp'), 120, 120);
  logFile(path.join(OUT_DIR, 'frame-empty@2x.webp'), 120, 120);
  await writeWebpFromSvg(sharp, frameSvg(true), path.join(OUT_DIR, 'frame-glow@2x.webp'), 120, 120);
  logFile(path.join(OUT_DIR, 'frame-glow@2x.webp'), 120, 120);
}

async function main() {
  const sharp = (await import('sharp')).default;
  let masterPath = null;
  for (const candidate of MASTER_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      masterPath = candidate;
      break;
    }
  }

  if (masterPath) {
    console.log('Using master PNG:', path.relative(ROOT, masterPath));
    await exportSceneFromMaster(masterPath);
  } else {
    console.log('No master PNG — procedural SVG fallback');
    await exportSceneFromSvg(sharp);
  }
  await exportFrames(sharp);
  console.log('Memory hall scene assets generated.');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
