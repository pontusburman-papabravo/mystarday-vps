#!/usr/bin/env node
/**
 * Prepares web-optimized Skattkammaren art from public/img/Barn UUID PNGs.
 * Run: node scripts/prepare-skattkammaren-assets.mjs
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(process.cwd(), 'public/img');
const SRC = path.join(ROOT, 'Barn');
const REF_SRC = path.join(ROOT, 'barn/skattkammaren/reference');
const OUT = path.join(ROOT, 'barn/skattkammaren');
const REF = path.join(OUT, 'reference');

const MAP = {
  scene: 'scene.png',
  plaque: 'plaque.png',
  pendingHistory: 'pendingHistory.png',
  mockA: 'mockA.png',
  mockB: 'mockB.png',
};

function srcPath(key, legacyFile) {
  const named = path.join(REF_SRC, MAP[key]);
  if (fs.existsSync(named)) return named;
  const legacy = path.join(SRC, legacyFile);
  if (fs.existsSync(legacy)) return legacy;
  return null;
}

async function ensureDirs() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(REF, { recursive: true });
}

async function copyReference(name) {
  const src = path.join(REF_SRC, MAP[name]);
  if (!fs.existsSync(src)) {
    console.warn('skip missing', name);
    return;
  }
  const dest = path.join(REF, name + '.png');
  if (path.resolve(src) === path.resolve(dest)) return;
  await sharp(src).png({ compressionLevel: 9 }).toFile(dest);
}

async function main() {
  await ensureDirs();

  const sceneSrc = srcPath('scene', MAP.scene);
  const plaqueSrc = srcPath('plaque', MAP.plaque);
  const phSrc = srcPath('pendingHistory', MAP.pendingHistory);

  if (!sceneSrc || !plaqueSrc || !phSrc) {
    console.error('Missing Barn reference assets in', REF_SRC);
    process.exit(1);
  }

  await sharp(sceneSrc)
    .resize({ width: 820, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, 'scene-room.webp'));

  await sharp(plaqueSrc)
    .extract({ left: 0, top: 0, width: 1122, height: 120 })
    .resize({ width: 480, withoutEnlargement: true })
    .webp({ quality: 90 })
    .toFile(path.join(OUT, 'plaque-crown.webp'));

  await sharp(sceneSrc)
    .extract({ left: 520, top: 1180, width: 220, height: 180 })
    .resize({ width: 96, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(path.join(OUT, 'deco-chest-closed.webp'));

  await sharp(plaqueSrc)
    .extract({ left: 30, top: 1040, width: 320, height: 300 })
    .resize({ width: 200, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(path.join(OUT, 'deco-chest-open.webp'));

  await sharp(phSrc)
    .extract({ left: 55, top: 95, width: 260, height: 260 })
    .resize({ width: 160, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(path.join(OUT, 'deco-hourglass.webp'));

  await sharp(phSrc)
    .extract({ left: 0, top: 430, width: 1122, height: 320 })
    .resize({ width: 720, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(path.join(OUT, 'history-chest-lid.webp'));

  for (const name of Object.keys(MAP)) {
    await copyReference(name);
  }

  const hej = path.join(SRC, 'Hej');
  if (fs.existsSync(hej)) fs.unlinkSync(hej);

  const sizes = fs.readdirSync(OUT)
    .filter((f) => f.endsWith('.webp'))
    .map((f) => {
      const st = fs.statSync(path.join(OUT, f));
      return `${f}: ${Math.round(st.size / 1024)}KB`;
    });
  console.log('Created', OUT);
  sizes.forEach((s) => console.log(' ', s));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
