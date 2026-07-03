#!/usr/bin/env node
/**
 * generate-memory-hall-scene.mjs — BL-041 scene export (G8).
 * Prefers hand-authored master PNG when present; falls back to procedural SVG v1.
 *
 * Master source: scripts/sources/memory-hall-scene-v2.png
 * Regenerate: npm run generate:memory-hall-scene
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/images/child/world/memory-hall');
const MASTER_PNG = path.join(ROOT, 'scripts/sources/memory-hall-scene-v2.png');

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
<svg xmlns="http://www.w3.org/2000/svg" width="860" height="1280" viewBox="0 0 860 1280">
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
  <rect width="860" height="1280" fill="url(#wallGrad)"/>
  <rect width="860" height="1280" fill="url(#windowGlow)"/>
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

async function writeWebpFromSvg(svg, outPath, width, height) {
  let pipeline = sharp(Buffer.from(svg), { density: 144 });
  if (width && height) pipeline = pipeline.resize(width, height, { fit: 'cover' });
  await pipeline.webp({ quality: 90, effort: 4 }).toFile(outPath);
  logFile(outPath, width, height);
}

function logFile(outPath, width, height) {
  const stat = fs.statSync(outPath);
  console.log('wrote', path.relative(ROOT, outPath), `${width}×${height}`, `${Math.round(stat.size / 1024)}KB`);
}

/**
 * Portrait crop; optional horizontal flip so window aligns with mu-hotspot--window (top-right).
 * Use --no-flop when master art already has window on the right (e.g. ChatGPT export).
 */
async function portraitBaseFromMaster(noFlop) {
  const meta = await sharp(MASTER_PNG).metadata();
  const portraitW = Math.round(meta.height * (860 / 1280));
  const left = Math.round((meta.width - portraitW) / 2);
  let pipeline = sharp(MASTER_PNG)
    .extract({ left, top: 0, width: portraitW, height: meta.height });
  if (!noFlop) pipeline = pipeline.flop();
  return pipeline;
}

async function exportSceneFromMaster(noFlop) {
  const base = await portraitBaseFromMaster(noFlop);
  const exports = [
    ['scene@2x.webp', 860, 1280],
    ['scene-860.webp', 860, 1280],
    ['scene-430.webp', 430, 640],
    ['scene-1280.webp', 1280, 1920],
  ];
  for (const [name, w, h] of exports) {
    await base.clone().resize(w, h, { fit: 'cover', position: 'centre' })
      .webp({ quality: 90, effort: 5 })
      .toFile(path.join(OUT_DIR, name));
    logFile(path.join(OUT_DIR, name), w, h);
  }
}

async function exportSceneFromSvg() {
  const sceneSvg = memoryHallSceneSvg();
  await writeWebpFromSvg(sceneSvg, path.join(OUT_DIR, 'scene@2x.webp'), 860, 1280);
  await writeWebpFromSvg(sceneSvg, path.join(OUT_DIR, 'scene-860.webp'), 860, 1280);
  await writeWebpFromSvg(sceneSvg, path.join(OUT_DIR, 'scene-430.webp'), 430, 640);
  await writeWebpFromSvg(sceneSvg, path.join(OUT_DIR, 'scene-1280.webp'), 1280, 1920);
}

async function exportFrames() {
  await writeWebpFromSvg(frameSvg(false), path.join(OUT_DIR, 'frame-empty@2x.webp'), 120, 120);
  await writeWebpFromSvg(frameSvg(true), path.join(OUT_DIR, 'frame-glow@2x.webp'), 120, 120);
}

async function main() {
  const noFlop = process.argv.includes('--no-flop')
    || process.env.MEMORY_HALL_SCENE_NO_FLOP === '1';
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (fs.existsSync(MASTER_PNG)) {
    console.log('Using master PNG:', path.relative(ROOT, MASTER_PNG), noFlop ? '(no flip)' : '(flop for window right)');
    await exportSceneFromMaster(noFlop);
  } else {
    console.log('No master PNG — procedural SVG fallback');
    await exportSceneFromSvg();
  }
  await exportFrames();
  console.log('Memory hall scene assets generated.');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
