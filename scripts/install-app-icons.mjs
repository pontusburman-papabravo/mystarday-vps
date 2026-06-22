/**
 * Generate PWA + iOS + Android icon sizes from assets/app-icon/source.png
 *
 * Usage:
 *   node scripts/install-app-icons.mjs
 *   node scripts/install-app-icons.mjs path/to/your-icon.png
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';

const ROOT = process.cwd();
const DEFAULT_SRC = path.join(ROOT, 'assets/app-icon/source.png');
const OUT_DIR = path.join(ROOT, 'assets/app-icon');
const PUBLIC_DIR = path.join(ROOT, 'public');

const src = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SRC;
if (!fs.existsSync(src)) {
  console.error(`Missing source icon: ${src}`);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

const master = path.join(OUT_DIR, 'icon-1024.png');

async function writeSquare(size, dest) {
  await sharp(src)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(dest);
}

async function main() {
  await writeSquare(1024, master);
  console.log(`wrote ${master} (1024×1024)`);

  const outputs = [
    { file: path.join(PUBLIC_DIR, 'icon-192.png'), size: 192 },
    { file: path.join(PUBLIC_DIR, 'icon-512.png'), size: 512 },
    { file: path.join(PUBLIC_DIR, 'apple-touch-icon.png'), size: 180 },
    { file: path.join(PUBLIC_DIR, 'favicon-32.png'), size: 32 },
    { file: path.join(PUBLIC_DIR, 'favicon-16.png'), size: 16 },
  ];

  for (const { file, size } of outputs) {
    await writeSquare(size, file);
    console.log(`wrote ${file} (${size}×${size})`);
  }

  // iOS AppIcon (after cap sync creates ios/)
  const iosSet = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
  if (fs.existsSync(path.dirname(iosSet))) {
    fs.mkdirSync(iosSet, { recursive: true });
    fs.copyFileSync(master, path.join(iosSet, 'AppIcon-1024.png'));
    fs.writeFileSync(
      path.join(iosSet, 'Contents.json'),
      JSON.stringify({
        images: [
          {
            filename: 'AppIcon-1024.png',
            idiom: 'universal',
            platform: 'ios',
            size: '1024x1024',
          },
        ],
        info: { author: 'xcode', version: 1 },
      }, null, 2)
    );
    console.log(`wrote iOS AppIcon → ${iosSet}`);
  } else {
    console.log('ios/ not present — run npm run cap:sync:ios on Mac, then re-run this script');
  }

  // Android launcher icons (after cap sync creates android/)
  const androidRes = path.join(ROOT, 'android/app/src/main/res');
  if (fs.existsSync(androidRes)) {
    execSync(`node "${path.join(ROOT, 'scripts/install-android-icons.mjs')}" "${master}"`, {
      stdio: 'inherit',
    });
  } else {
    console.log('android/ not present — run npm run cap:sync:android, then re-run this script');
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
