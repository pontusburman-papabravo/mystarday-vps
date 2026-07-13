import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFfmpeg } from '../lib/ffmpeg.mjs';
import { generatePlaceholderLogo } from '../lib/placeholders.mjs';
import { ensureBrandAssets } from './setup-brand-assets.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const refs = [
  ['morning-family.png', '0x2D5A87'],
  ['evening-family.png', '0x5C4B7A'],
  ['real-family.png', '0x4A7C59'],
];

for (const [name, color] of refs) {
  const out = path.join(ROOT, 'assets/references', name);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=${color}:s=1280x720`,
    '-frames:v', '1',
    out,
  ], { label: `reference ${name}` });
}

generatePlaceholderLogo();
ensureBrandAssets();
console.log('Test assets ready.');
