#!/usr/bin/env node
/**
 * Living World — garden placeholder assets (WebP).
 * Replace files in public/assets/worlds/garden/ with final art; keep filenames.
 *
 * Usage: npm run garden:assets
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'assets', 'worlds', 'garden');

const LAYERS = [
  {
    file: 'background.webp',
    width: 800,
    height: 1400,
    svg: backgroundSvg(),
  },
  {
    file: 'house-left.webp',
    width: 520,
    height: 1100,
    svg: houseLeftSvg(),
  },
  {
    file: 'path.webp',
    width: 700,
    height: 420,
    svg: pathSvg(),
  },
  {
    file: 'flowers.webp',
    width: 620,
    height: 480,
    svg: flowersSvg(),
  },
  {
    file: 'foreground-leaves.webp',
    width: 800,
    height: 520,
    svg: foregroundLeavesSvg(),
  },
  {
    file: 'clouds.webp',
    width: 900,
    height: 280,
    svg: cloudsSvg(),
  },
  {
    file: 'bird.webp',
    width: 96,
    height: 64,
    svg: birdSvg(),
  },
  {
    file: 'butterfly.webp',
    width: 88,
    height: 72,
    svg: butterflySvg(),
  },
];

function backgroundSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1400">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#a8d8f0"/>
      <stop offset="45%" stop-color="#d4efe8"/>
      <stop offset="72%" stop-color="#9fd4a0"/>
      <stop offset="100%" stop-color="#6faa62"/>
    </linearGradient>
    <radialGradient id="sunGlow" cx="22%" cy="12%" r="18%">
      <stop offset="0%" stop-color="#fff8dc" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#f5c842" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7aab72"/>
      <stop offset="100%" stop-color="#5d8f58"/>
    </linearGradient>
    <linearGradient id="hillMid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6b9f64"/>
      <stop offset="100%" stop-color="#4f8448"/>
    </linearGradient>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="2"/>
    </filter>
  </defs>
  <rect width="800" height="1400" fill="url(#sky)"/>
  <ellipse cx="175" cy="155" rx="120" ry="95" fill="url(#sunGlow)"/>
  <ellipse cx="175" cy="155" rx="52" ry="52" fill="#f8e08a" opacity="0.85"/>
  <path d="M0 720 Q200 640 380 680 T800 650 L800 1400 L0 1400 Z" fill="url(#hillFar)" opacity="0.75"/>
  <path d="M0 820 Q260 760 480 790 T800 770 L800 1400 L0 1400 Z" fill="url(#hillMid)" opacity="0.88"/>
  <ellipse cx="620" cy="700" rx="28" ry="38" fill="#e8a0b8" opacity="0.55" filter="url(#soft)"/>
  <rect x="598" y="720" width="8" height="42" rx="3" fill="#6d4c33" opacity="0.5"/>
  <path d="M520 690 Q560 660 590 685 Q575 710 540 705 Q525 700 520 690Z" fill="#8fbf78" opacity="0.6"/>
  <ellipse cx="555" cy="678" rx="34" ry="22" fill="#f0c4d8" opacity="0.45"/>
  <rect x="548" y="698" width="52" height="28" rx="6" fill="#e8dcc8" opacity="0.7"/>
  <rect x="556" y="706" width="14" height="14" rx="2" fill="#ffe9a8" opacity="0.9"/>
  <rect x="576" y="706" width="14" height="14" rx="2" fill="#ffe9a8" opacity="0.75"/>
  <ellipse cx="680" cy="760" rx="90" ry="18" fill="#78b8d8" opacity="0.35"/>
</svg>`;
}

function houseLeftSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 1100">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f0e4d0"/>
      <stop offset="70%" stop-color="#e2d0b4"/>
      <stop offset="100%" stop-color="#e2d0b4" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="doorWood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#a0713d"/>
      <stop offset="100%" stop-color="#6d4520"/>
    </linearGradient>
    <radialGradient id="doorGlow" cx="70%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#fff4d0" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#f5d88a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="420" height="1100" fill="url(#wall)"/>
  <path d="M380 0 L520 0 L520 1100 L400 1100 Z" fill="#000" opacity="0.06"/>
  <rect x="175" y="430" width="210" height="430" rx="28" fill="url(#doorWood)"/>
  <rect x="195" y="455" width="170" height="390" rx="22" fill="url(#doorGlow)"/>
  <ellipse cx="355" cy="640" rx="8" ry="8" fill="#d4a84a"/>
  <rect x="210" y="820" width="140" height="18" rx="6" fill="#8b6914" opacity="0.75"/>
  <path d="M30 200 Q60 180 90 210 T150 195" stroke="#6b8f71" stroke-width="6" fill="none" opacity="0.45"/>
  <ellipse cx="70" cy="220" rx="22" ry="14" fill="#7cb562" opacity="0.5"/>
  <ellipse cx="110" cy="250" rx="18" ry="12" fill="#8fd06a" opacity="0.45"/>
</svg>`;
}

function pathSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 420">
  <defs>
    <linearGradient id="dirt" x1="0" y1="0" x2="1" y2="0.3">
      <stop offset="0%" stop-color="#c4a882" stop-opacity="0"/>
      <stop offset="20%" stop-color="#c4a882" stop-opacity="0.55"/>
      <stop offset="80%" stop-color="#b8956a" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#b8956a" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  <path d="M40 380 Q180 320 280 280 T520 180 Q580 140 660 80" stroke="url(#dirt)" stroke-width="95" fill="none" stroke-linecap="round"/>
  <path d="M80 360 Q200 300 300 260 T540 160" stroke="#d4bc98" stroke-width="12" fill="none" opacity="0.35" stroke-linecap="round"/>
  <ellipse cx="180" cy="330" rx="22" ry="10" fill="#a89070" opacity="0.4"/>
  <ellipse cx="340" cy="250" rx="18" ry="8" fill="#a89070" opacity="0.35"/>
  <ellipse cx="480" cy="190" rx="16" ry="7" fill="#a89070" opacity="0.3"/>
</svg>`;
}

function flowersSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 480">
  <defs>
    <radialGradient id="petal" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#ffe566"/>
      <stop offset="100%" stop-color="#e8a030"/>
    </radialGradient>
  </defs>
  <ellipse cx="310" cy="460" rx="280" ry="22" fill="#000" opacity="0.08"/>
  <rect x="295" y="220" width="12" height="200" rx="5" fill="#4a7a38"/>
  <circle cx="301" cy="195" r="58" fill="url(#petal)" opacity="0.92"/>
  <circle cx="301" cy="195" r="22" fill="#8b5a20" opacity="0.55"/>
  <circle cx="120" cy="340" r="14" fill="#c77dff" opacity="0.85"/>
  <rect x="116" y="350" width="5" height="45" rx="2" fill="#4a7a38"/>
  <circle cx="480" cy="355" r="12" fill="#ff8fab" opacity="0.85"/>
  <rect x="477" y="363" width="5" height="40" rx="2" fill="#4a7a38"/>
  <circle cx="200" cy="390" r="10" fill="#ffb347" opacity="0.8"/>
  <rect x="197" y="396" width="4" height="35" rx="2" fill="#4a7a38"/>
  <path d="M40 420 Q80 400 120 420" stroke="#6faa62" stroke-width="8" fill="none" opacity="0.5"/>
  <path d="M500 430 Q540 410 580 425" stroke="#6faa62" stroke-width="8" fill="none" opacity="0.5"/>
</svg>`;
}

function foregroundLeavesSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520">
  <defs>
    <linearGradient id="leafG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5a9344"/>
      <stop offset="100%" stop-color="#3d6e32"/>
    </linearGradient>
  </defs>
  <path d="M0 520 L0 280 Q80 220 140 260 Q200 180 260 240 Q180 320 120 380 Q60 440 0 520Z" fill="url(#leafG)" opacity="0.92"/>
  <path d="M800 520 L800 300 Q720 240 660 280 Q600 200 540 260 Q620 340 680 400 Q740 460 800 520Z" fill="url(#leafG)" opacity="0.9"/>
  <path d="M0 520 L800 520 L800 420 Q600 380 400 400 Q200 420 0 400 Z" fill="#4f8448" opacity="0.75"/>
  <ellipse cx="120" cy="430" rx="18" ry="28" fill="#7cb562" opacity="0.65" transform="rotate(-25 120 430)"/>
  <ellipse cx="680" cy="440" rx="16" ry="26" fill="#8fd06a" opacity="0.6" transform="rotate(20 680 440)"/>
  <circle cx="60" cy="470" r="8" fill="#ff8fab" opacity="0.7"/>
  <circle cx="740" cy="475" r="7" fill="#ffe566" opacity="0.7"/>
</svg>`;
}

function cloudsSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 280">
  <ellipse cx="180" cy="140" rx="110" ry="42" fill="#fff" opacity="0.82"/>
  <ellipse cx="130" cy="155" rx="70" ry="32" fill="#fff" opacity="0.75"/>
  <ellipse cx="240" cy="160" rx="80" ry="30" fill="#fff" opacity="0.7"/>
  <ellipse cx="520" cy="100" rx="95" ry="36" fill="#fff" opacity="0.78"/>
  <ellipse cx="470" cy="118" rx="60" ry="28" fill="#fff" opacity="0.72"/>
  <ellipse cx="580" cy="115" rx="70" ry="26" fill="#fff" opacity="0.68"/>
  <ellipse cx="780" cy="150" rx="85" ry="34" fill="#fff" opacity="0.65"/>
  <ellipse cx="730" cy="165" rx="55" ry="25" fill="#fff" opacity="0.6"/>
</svg>`;
}

function birdSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 64">
  <path d="M8 36 Q24 20 40 32 Q56 12 72 28 Q60 40 44 38 Q28 48 8 36Z" fill="#3d4f5c"/>
  <path d="M72 28 L88 24 L80 32 Z" fill="#3d4f5c"/>
  <circle cx="36" cy="30" r="3" fill="#1b2340"/>
  </svg>`;
}

function butterflySvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 72">
  <ellipse cx="28" cy="36" rx="24" ry="28" fill="#ffb347" opacity="0.9"/>
  <ellipse cx="60" cy="36" rx="24" ry="28" fill="#ff8c42" opacity="0.9"/>
  <ellipse cx="44" cy="36" rx="6" ry="22" fill="#5a4028"/>
  <circle cx="44" cy="18" r="5" fill="#3d2914"/>
  </svg>`;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let totalBytes = 0;

  for (const layer of LAYERS) {
    const buf = await sharp(Buffer.from(layer.svg))
      .resize(layer.width, layer.height, { fit: 'fill' })
      .webp({ quality: 82, alphaQuality: 90, effort: 4 })
      .toBuffer();
    const outPath = path.join(OUT, layer.file);
    fs.writeFileSync(outPath, buf);
    totalBytes += buf.length;
    console.log(`${layer.file}  ${(buf.length / 1024).toFixed(1)} KB  (${layer.width}x${layer.height})`);
  }

  const maxMb = 2;
  if (totalBytes > maxMb * 1024 * 1024) {
    console.warn(`WARN: total garden assets ${(totalBytes / 1024 / 1024).toFixed(2)} MB exceeds ${maxMb} MB budget`);
    process.exitCode = 1;
  } else {
    console.log(`Total: ${(totalBytes / 1024).toFixed(1)} KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
