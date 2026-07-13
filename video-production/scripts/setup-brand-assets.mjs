#!/usr/bin/env node
/** Copy app brand mark from public/icon-512.png — required before final render. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATHS } from '../lib/config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_PUBLIC = path.resolve(__dirname, '..', '..', 'public');
const SRC = path.join(REPO_PUBLIC, 'icon-512.png');
const DEST = PATHS.brandMark;

export function ensureBrandAssets() {
  fs.mkdirSync(path.dirname(DEST), { recursive: true });
  if (!fs.existsSync(SRC)) {
    throw new Error(
      `Brand mark source missing: ${SRC}. Cannot render end board without icon-512.png.`,
    );
  }
  const srcStat = fs.statSync(SRC);
  const needsCopy = !fs.existsSync(DEST)
    || fs.statSync(DEST).mtimeMs < srcStat.mtimeMs
    || fs.statSync(DEST).size !== srcStat.size;
  if (needsCopy) {
    fs.copyFileSync(SRC, DEST);
  }
  return DEST;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dest = ensureBrandAssets();
  console.log('Brand mark:', dest);
}
