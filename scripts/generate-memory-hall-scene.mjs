#!/usr/bin/env node
/**
 * generate-memory-hall-scene.mjs — BL-041 v1 procedural scene (G8).
 * Exports WebP set per docs/art-specs/memory-hall-bl041.md
 * Regenerate: npm run generate:memory-hall-scene
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/images/child/world/memory-hall');

/** Art spec palette */
const COLORS = {
  cream: '#f7f0e4',
  creamMid: '#efe6d8',
  creamDeep: '#dcc9b0',
  amber: '#e8c9a0',
  amberLight: '#fff8dc',
  wood: '#c4a882',
  woodDark: '#a8845a',
  shadow: 'rgba(27, 35, 64, 0.14)',
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
    <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.creamDeep}" stop-opacity="0"/>
      <stop offset="18%" stop-color="${COLORS.wood}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#b8946a" stop-opacity="0.75"/>
    </linearGradient>
    <radialGradient id="windowGlow" cx="72%" cy="18%" r="45%">
      <stop offset="0%" stop-color="${COLORS.amberLight}" stop-opacity="0.85"/>
      <stop offset="45%" stop-color="${COLORS.amber}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${COLORS.amber}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="45%" r="72%">
      <stop offset="55%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#1b2340" stop-opacity="0.12"/>
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#1b2340" flood-opacity="0.12"/>
    </filter>
  </defs>

  <!-- Wall -->
  <rect width="860" height="1280" fill="url(#wallGrad)"/>
  <rect width="860" height="1280" fill="url(#windowGlow)"/>

  <!-- Ceiling wash -->
  <ellipse cx="430" cy="120" rx="360" ry="90" fill="${COLORS.amberLight}" opacity="0.12"/>

  <!-- Window (top right hotspot zone) -->
  <g filter="url(#softShadow)">
    <rect x="548" y="96" width="248" height="196" rx="16" ry="16" fill="${COLORS.amberLight}" stroke="${COLORS.woodDark}" stroke-width="6"/>
    <rect x="668" y="96" width="6" height="196" fill="${COLORS.woodDark}" opacity="0.55"/>
    <rect x="548" y="191" width="248" height="6" fill="${COLORS.woodDark}" opacity="0.55"/>
    <rect x="560" y="108" width="224" height="172" rx="8" fill="${COLORS.amber}" opacity="0.25"/>
  </g>

  <!-- Wall frames (empty wood — not trophy cases) -->
  <g filter="url(#softShadow)">
    <rect x="96" y="360" width="148" height="184" rx="10" fill="${COLORS.cream}" stroke="${COLORS.woodDark}" stroke-width="5"/>
    <rect x="108" y="372" width="124" height="160" rx="6" fill="${COLORS.creamMid}" stroke="${COLORS.wood}" stroke-width="2"/>

    <rect x="356" y="340" width="148" height="184" rx="10" fill="${COLORS.cream}" stroke="${COLORS.woodDark}" stroke-width="5"/>
    <rect x="368" y="352" width="124" height="160" rx="6" fill="${COLORS.creamMid}" stroke="${COLORS.wood}" stroke-width="2"/>

    <rect x="616" y="380" width="148" height="184" rx="10" fill="${COLORS.cream}" stroke="${COLORS.woodDark}" stroke-width="5"/>
    <rect x="628" y="392" width="124" height="160" rx="6" fill="${COLORS.creamMid}" stroke="${COLORS.wood}" stroke-width="2"/>
  </g>

  <!-- Picture rail -->
  <rect x="64" y="320" width="732" height="4" rx="2" fill="${COLORS.wood}" opacity="0.45"/>

  <!-- Floor -->
  <rect x="0" y="920" width="860" height="360" fill="url(#floorGrad)"/>
  <ellipse cx="430" cy="1080" rx="300" ry="80" fill="#8b5e3c" opacity="0.14"/>

  <!-- Rug -->
  <ellipse cx="430" cy="1040" rx="220" ry="72" fill="#c4956a" opacity="0.22"/>
  <ellipse cx="430" cy="1040" rx="180" ry="56" fill="${COLORS.cream}" opacity="0.35"/>

  <!-- Baseboard -->
  <rect x="0" y="900" width="860" height="14" fill="${COLORS.woodDark}" opacity="0.25"/>

  <!-- Bottom third kept calm for UI overlay (FAB + exhibit row) -->
  <rect x="0" y="980" width="860" height="300" fill="${COLORS.cream}" opacity="0.03"/>

  <!-- Vignette -->
  <rect width="860" height="1280" fill="url(#vignette)"/>
</svg>`;
}

function frameSvg(glow) {
  const inner = glow
    ? `<rect x="8" y="8" width="104" height="104" rx="8" fill="${COLORS.amberLight}" opacity="0.55"/>
       <rect x="14" y="14" width="92" height="92" rx="6" fill="${COLORS.cream}"/>`
    : `<rect x="14" y="14" width="92" height="92" rx="6" fill="${COLORS.creamMid}"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <rect x="4" y="4" width="112" height="112" rx="10" fill="${COLORS.cream}" stroke="${COLORS.woodDark}" stroke-width="4"/>
  ${inner}
</svg>`;
}

async function writeWebpFromSvg(svg, outPath, width, height) {
  const buf = Buffer.from(svg);
  let pipeline = sharp(buf, { density: 144 });
  if (width && height) {
    pipeline = pipeline.resize(width, height, { fit: 'cover' });
  }
  await pipeline.webp({ quality: 88, effort: 4 }).toFile(outPath);
  const stat = fs.statSync(outPath);
  console.log('wrote', path.relative(ROOT, outPath), `${width || 'native'}×${height || 'native'}`, `${Math.round(stat.size / 1024)}KB`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const sceneSvg = memoryHallSceneSvg();

  await writeWebpFromSvg(sceneSvg, path.join(OUT_DIR, 'scene@2x.webp'), 860, 1280);
  await writeWebpFromSvg(sceneSvg, path.join(OUT_DIR, 'scene-860.webp'), 860, 1280);
  await writeWebpFromSvg(sceneSvg, path.join(OUT_DIR, 'scene-430.webp'), 430, 640);
  await writeWebpFromSvg(sceneSvg, path.join(OUT_DIR, 'scene-1280.webp'), 1280, 1920);

  await writeWebpFromSvg(frameSvg(false), path.join(OUT_DIR, 'frame-empty@2x.webp'), 120, 120);
  await writeWebpFromSvg(frameSvg(true), path.join(OUT_DIR, 'frame-glow@2x.webp'), 120, 120);

  console.log('Memory hall scene assets generated.');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
