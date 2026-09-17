#!/usr/bin/env node
/**
 * Generate resource-library PDFs for sv-SE and en-GB.
 * Usage: node scripts/generate-resurser-pdfs.mjs
 */
import { createWriteStream } from 'fs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const { PDF_ASSETS, LOCALES, allPictogramKeys } = require('../config/resurser-catalog');
const { generateResurserPdf, preloadResurserIcons } = require('../src/lib/resurser-pdf');
const { loadResurserI18n } = require('../src/lib/resurser-i18n');

function outDirFor(locale) {
  return locale === 'en-GB'
    ? path.join(ROOT, 'public/en/resources/pdf')
    : path.join(ROOT, 'public/resurser/pdf');
}

function writePdf(outPath, job) {
  return new Promise((resolve, reject) => {
    const stream = createWriteStream(outPath);
    stream.on('finish', () => {
      const stat = fs.statSync(outPath);
      console.log(`✓ ${path.relative(ROOT, outPath)} (${stat.size} bytes)`);
      resolve();
    });
    stream.on('error', reject);
    generateResurserPdf(stream, job);
  });
}

async function main() {
  await preloadResurserIcons(allPictogramKeys());

  for (const locale of LOCALES) {
    const dir = outDirFor(locale);
    fs.mkdirSync(dir, { recursive: true });
    const t = loadResurserI18n(locale);
    for (const asset of PDF_ASSETS) {
      const copy = t.pdf[asset.id] || {};
      const file = locale === 'en-GB' ? asset.fileEn : asset.fileSv;
      const exampleLabels = asset.exampleLabelsKey ? t.ui[asset.exampleLabelsKey] : null;
      await writePdf(path.join(dir, file), {
        type: asset.type,
        keys: asset.keys,
        title: copy.title,
        subtitle: copy.subtitle || '',
        emptyBoxes: !!asset.emptyBoxes,
        exampleLabels,
        locale,
      });
    }
  }

  console.log(`Done — ${PDF_ASSETS.length} PDFs × ${LOCALES.length} locales`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
