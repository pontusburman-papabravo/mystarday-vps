#!/usr/bin/env node
/**
 * Install branded launcher icons into android/ after `npx cap sync android`.
 *
 * Replaces the default Capacitor icon with assets/app-icon/icon-1024.png
 * (gold star — same asset as Play Store hi-res icon).
 *
 * Usage:
 *   node scripts/install-android-icons.mjs
 *   node scripts/install-android-icons.mjs path/to/icon-1024.png
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
const DEFAULT_SRC = path.join(ROOT, 'assets/app-icon/icon-1024.png');
const RES_DIR = path.join(ROOT, 'android/app/src/main/res');
const BG_COLOR = '#F5A623';

const LAUNCHER_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const FOREGROUND_SIZES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

const src = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SRC;

if (!fs.existsSync(RES_DIR)) {
  console.log('android/ not present — run npm run cap:sync:android first');
  process.exit(0);
}

if (!fs.existsSync(src)) {
  console.error(`Missing source icon: ${src}`);
  console.error('Run: node scripts/install-app-icons.mjs');
  process.exit(1);
}

async function writePng(size, dest) {
  await sharp(src)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(dest);
}

async function patchBackgroundColor() {
  const colorXml = path.join(RES_DIR, 'values/ic_launcher_background.xml');
  const content = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG_COLOR}</color>
</resources>
`;
  fs.writeFileSync(colorXml, content);
  console.log(`updated ${colorXml} → ${BG_COLOR}`);
}

async function main() {
  const master = sharp(src);
  const meta = await master.metadata();
  if (!meta.width || !meta.height || meta.width !== meta.height) {
    console.warn(`Warning: icon should be square (got ${meta.width}×${meta.height})`);
  }

  for (const [folder, size] of Object.entries(LAUNCHER_SIZES)) {
    const dir = path.join(RES_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
      const dest = path.join(dir, name);
      await writePng(size, dest);
      console.log(`wrote ${dest} (${size}×${size})`);
    }
  }

  for (const [folder, size] of Object.entries(FOREGROUND_SIZES)) {
    const dest = path.join(RES_DIR, folder, 'ic_launcher_foreground.png');
    await writePng(size, dest);
    console.log(`wrote ${dest} (${size}×${size})`);
  }

  await patchBackgroundColor();
  console.log('Android launcher icons installed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
