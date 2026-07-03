#!/usr/bin/env node
/**
 * Generate all resursbibliotek PDFs (R1 + R2) into public/resurser/pdf/
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
const {
  EMOTION_KEYS,
  TRANSITION_KEYS,
  TEACCH_KEYS,
  SCHOOL_KEYS,
  HYGIENE_KEYS,
} = require('../config/resurser-r2');
const { WEEKEND_KEYS, HOMEWORK_KEYS } = require('../config/resurser-r3-pdf-keys');
const { generateResurserPdf } = require('../src/lib/resurser-pdf');

const JOBS = [
  // ── R1 morgon/kväll ─────────────────────────────────────
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
  // ── R2 känslor ──────────────────────────────────────────
  {
    file: 'bildkort-kanslor.pdf',
    type: 'bildkort',
    keys: EMOTION_KEYS,
    title: 'Känslokort',
  },
  // ── R2 övergångar ───────────────────────────────────────
  {
    file: 'overgangsschema.pdf',
    type: 'schedule',
    keys: TRANSITION_KEYS,
    title: 'Övergångsschema — tom mall',
    subtitle: 'Tomma rutor för först–sedan och övergångssteg.',
    emptyBoxes: true,
  },
  {
    file: 'overgangsschema-exempel.pdf',
    type: 'schedule',
    keys: TRANSITION_KEYS,
    title: 'Övergångsschema — exempel',
    subtitle: 'Vanliga övergångssteg — först, sedan, nu och vänta.',
    emptyBoxes: false,
  },
  {
    file: 'bildkort-overgangar.pdf',
    type: 'bildkort',
    keys: TRANSITION_KEYS,
    title: 'Övergångskort',
  },
  // ── R2 TEACCH-inspirerat ──────────────────────────────────
  {
    file: 'bildkort-teacch.pdf',
    type: 'bildkort',
    keys: TEACCH_KEYS,
    title: 'TEACCH-inspirerade kort',
  },
  // ── R2 skola ────────────────────────────────────────────
  {
    file: 'skolaschema.pdf',
    type: 'schedule',
    keys: SCHOOL_KEYS,
    title: 'Skolaschema — tom mall',
    subtitle: 'Tomma rutor för skoldagsrutinen.',
    emptyBoxes: true,
  },
  {
    file: 'skolaschema-exempel.pdf',
    type: 'schedule',
    keys: SCHOOL_KEYS,
    title: 'Skolaschema — exempel',
    subtitle: 'Vanliga skoldagssteg — anpassa efter barnets vecka.',
    emptyBoxes: false,
  },
  {
    file: 'bildkort-skola.pdf',
    type: 'bildkort',
    keys: SCHOOL_KEYS,
    title: 'Skola-bildkort',
  },
  // ── R2 hygien ─────────────────────────────────────────────
  {
    file: 'hygienschema.pdf',
    type: 'schedule',
    keys: HYGIENE_KEYS,
    title: 'Hygienschema — tom mall',
    subtitle: 'Tomma rutor för hygienrutinen.',
    emptyBoxes: true,
  },
  {
    file: 'hygienschema-exempel.pdf',
    type: 'schedule',
    keys: HYGIENE_KEYS,
    title: 'Hygienschema — exempel',
    subtitle: 'Vanliga hygiensteg — tvätta händer, tänder med mera.',
    emptyBoxes: false,
  },
  {
    file: 'bildkort-hygien.pdf',
    type: 'bildkort',
    keys: HYGIENE_KEYS,
    title: 'Hygien-bildkort',
  },
  // ── R2 belöning + vecko ───────────────────────────────────
  {
    file: 'beloningsschema.pdf',
    type: 'beloning',
    title: 'Belöningsschema — stjärnschema',
    subtitle: 'Skriv aktiviteter i vänster kolumn och fyll i stjärnor när barnet klarat dem.',
  },
  {
    file: 'veckoschema.pdf',
    type: 'veckoschema',
    title: 'Veckoschema — tom mall',
    subtitle: 'Fyll i vad som händer varje veckodag — mån till sön.',
  },
  {
    file: 'veckoschema-exempel.pdf',
    type: 'veckoschema',
    title: 'Veckoschema — exempel',
    subtitle: 'Exempel på hur veckan kan se ut — justera efter er familj.',
    exampleLabels: ['Skola', 'Sim', 'Skola', 'Skola', 'Skola', 'Lek', 'Vila'],
  },
  // ── R3 helg + läxa ───────────────────────────────────────
  {
    file: 'helgschema.pdf',
    type: 'schedule',
    keys: WEEKEND_KEYS,
    title: 'Helgschema — exempel',
    subtitle: 'Lugna helgsteg utan skolstress — justera efter er familj.',
    emptyBoxes: false,
  },
  {
    file: 'laxschema.pdf',
    type: 'schedule',
    keys: HOMEWORK_KEYS,
    title: 'Läxschema — steg för steg',
    subtitle: 'Dela upp läxor i små moment — paus och klart-markerade.',
    emptyBoxes: false,
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
