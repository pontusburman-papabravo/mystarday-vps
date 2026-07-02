#!/usr/bin/env node
/**
 * Generate R1 resursbibliotek PDFs into public/resurser/pdf/
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
const OUT_DIR = path.join(ROOT, 'public/resurser/pdf');
const { MORNING_KEYS, EVENING_KEYS } = require('../config/resurser-r1');
const { generateResurserPdf } = require('../src/lib/resurser-pdf');

const JOBS = [
  {
    file: 'morgonschema.pdf',
    type: 'schedule',
    keys: MORNING_KEYS,
    title: 'Morgonschema — tom mall',
    subtitle: 'Skriv egna steg i rutorna eller klistra på egna bilder.',
    emptyBoxes: true,
  },
  {
    file: 'morgonschema-exempel.pdf',
    type: 'schedule',
    keys: MORNING_KEYS,
    title: 'Morgonschema — exempel',
    subtitle: 'Vanliga morgonsteg att utgå från. Justera efter er familj.',
    emptyBoxes: false,
  },
  {
    file: 'kvallsschema.pdf',
    type: 'schedule',
    keys: EVENING_KEYS,
    title: 'Kvällsschema — tom mall',
    subtitle: 'Tomma rutor för er kvällsrutin.',
    emptyBoxes: true,
  },
  {
    file: 'kvallsschema-exempel.pdf',
    type: 'schedule',
    keys: EVENING_KEYS,
    title: 'Kvällsschema — exempel',
    subtitle: 'Lugna kvällssteg — anpassa ordning och antal.',
    emptyBoxes: false,
  },
  {
    file: 'bildkort-morgon.pdf',
    type: 'bildkort',
    keys: MORNING_KEYS,
    title: 'Morgon-bildkort',
  },
  {
    file: 'bildkort-kvall.pdf',
    type: 'bildkort',
    keys: EVENING_KEYS,
    title: 'Kväll-bildkort',
  },
];

function writePdf(job) {
  const outPath = path.join(OUT_DIR, job.file);
  return new Promise((resolve, reject) => {
    const stream = createWriteStream(outPath);
    stream.on('finish', () => {
      const stat = fs.statSync(outPath);
      console.log(`✓ ${job.file} (${stat.size} bytes)`);
      resolve();
    });
    stream.on('error', reject);
    generateResurserPdf(stream, job);
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const job of JOBS) {
    await writePdf(job);
  }
  console.log(`Done — ${JOBS.length} PDFs in public/resurser/pdf/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
