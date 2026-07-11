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
const OUT = path.join(ROOT, 'barn/skattkammaren');
const REF = path.join(OUT, 'reference');

const MAP = {
  scene: 'DDE7C72A-185D-4581-BC22-C78A48FFC385.png',
  plaque: '1B1CBD5B-7318-428E-83AA-B13002615FE9.png',
  pendingHistory: '2D807344-8BC7-4479-8DBF-431C8B313DAA.png',
  mockA: '196708C5-8EE1-46F9-A563-74D6D6C0EAA8.png',
  mockB: '82836419-315D-4FED-AF0C-495A82740ECC.png',
};

async function ensureDirs() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(REF, { recursive: true });
}

async function copyReference(name, file) {
  const src = path.join(SRC, file);
  if (!fs.existsSync(src)) {
    console.warn('skip missing', file);
    return;
  }
  await sharp(src).png({ compressionLevel: 9 }).toFile(path.join(REF, name + '.png'));
}

async function main() {
  await ensureDirs();

  const sceneSrc = path.join(SRC, MAP.scene);
  const plaqueSrc = path.join(SRC, MAP.plaque);
  const phSrc = path.join(SRC, MAP.pendingHistory);

  if (!fs.existsSync(sceneSrc)) {
    console.error('Missing Barn scene asset — run from repo with public/img/Barn populated');
    process.exit(1);
  }

  await sharp(sceneSrc)
    .resize({ width: 820, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, 'scene-room.webp'));

  await sharp(plaqueSrc)
    .extract({ left: 0, top: 0, width: 1122, height: 195 })
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(path.join(OUT, 'plaque-crown.webp'));

  await sharp(plaqueSrc)
    .extract({ left: 30, top: 1040, width: 320, height: 300 })
    .resize({ width: 200, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(path.join(OUT, 'deco-chest-open.webp'));

  await sharp(plaqueSrc)
    .extract({ left: 380, top: 700, width: 360, height: 200 })
    .resize({ width: 120, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(path.join(OUT, 'deco-chest-closed.webp'));

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

  for (const [name, file] of Object.entries(MAP)) {
    await copyReference(name, file);
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
