#!/usr/bin/env node
/**
 * Copy built AAB to data/downloads/ and print mobile download URL.
 * Run after: npm run android:aab
 *
 * On VPS: set AAB_DOWNLOAD_TOKEN and APP_URL in .env, copy play-release.aab to data/downloads/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'play-store', 'out', 'min-stjarnadag-release.aab');
const DEST = path.join(ROOT, 'data', 'downloads', 'play-release.aab');
const APP_URL = process.env.APP_URL;

if (!fs.existsSync(SRC)) {
  console.error('Missing AAB. Run: npm run android:aab');
  process.exit(1);
}

fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.copyFileSync(SRC, DEST);
const mb = (fs.statSync(DEST).size / (1024 * 1024)).toFixed(2);
console.log(`Copied AAB → ${DEST} (${mb} MB)`);

const token = process.env.AAB_DOWNLOAD_TOKEN || crypto.randomBytes(16).toString('hex');
if (!process.env.AAB_DOWNLOAD_TOKEN) {
  console.log('\nAdd to VPS .env:');
  console.log(`AAB_DOWNLOAD_TOKEN=${token}`);
}
console.log('\nMobile download page:');
if (!APP_URL) {
  console.log('(set APP_URL to print full links)');
} else {
  const base = APP_URL.replace(/\/$/, '');
  console.log(`${base}/downloads/android?token=${token}`);
  console.log('\nDirect AAB link:');
  console.log(`${base}/downloads/play-release.aab?token=${token}`);
}
