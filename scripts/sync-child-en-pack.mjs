#!/usr/bin/env node
/**
 * sync-child-en-pack.mjs — Apply English copy to child_en experience pack files.
 * Reads child_se structure, replaces localizable strings via translation map.
 * Run: node scripts/sync-child-en-pack.mjs
 * Verify: node scripts/audit-child-pack-parity.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SE_DIR = path.join(__dirname, '../config/experience-packs/child_se');
const EN_DIR = path.join(__dirname, '../config/experience-packs/child_en');

const FILES = [
  'ambient-objects.json',
  'exhibits.json',
  'living-objects.json',
  'progression.json',
  'rewards.json',
  'scenes.json',
];

const LOCALIZABLE_KEY = /(?:_sv|_template)$|^headline$|^body$|^cta$|^world_hint$|^child_message$|^emotional_beat$|^description$/;

/** Swedish → English for all localizable pack strings in normal Child Core reach. */
const TRANSLATIONS = {
  'Badrummet': 'Bathroom',
  'Belöning som varmt minne — inte butik': 'A reward as a warm memory — not a shop',
  'Blomman': 'The flower',
  'Blomman nickar glatt.': 'The flower nods happily.',
  'Blomsterbädden': 'The flower bed',
  'Brasan': 'The fireplace',
  'Bryggan': 'The jetty',
  'Bädden': 'The bed',
  'Dagens blomma': "Today's flower",
  'Den gosiga vännen ler mot dig.': 'Your cosy friend smiles at you.',
  'Dina stjärnor väntar!': 'Your stars are waiting!',
  'Du planterade ett frö!': 'You planted a seed!',
  'Du skördade solrosen!': 'You picked the sunflower!',
  'Du vattnade fröet': 'You watered the seed',
  'Du vattnade fröet — nu växer det!': 'You watered the seed — now it is growing!',
  'En fjäril dansar förbi.': 'A butterfly dances past.',
  'Ett litet moln droppar ner.': 'A little cloud drips down.',
  'Ett mjukt sken väcker rummet.': 'A soft glow wakes up the room.',
  'Ett varmt ljus tänds när dagen börjar.': 'A warm light turns on as the day begins.',
  'Fjärilen': 'The butterfly',
  'Frukostbordet': 'The breakfast table',
  'Fröet är planterat': 'The seed is planted',
  'Fågeln': 'The bird',
  'Fönstret': 'The window',
  'Första foten innanför — du hör hemma.': 'First step inside — you belong here.',
  'Gardinen': 'The curtain',
  'Gosedjuret': 'The cuddly toy',
  'Gå ut till trädgården': 'Go out to the garden',
  'Hallen': 'The hallway',
  'Hemmet utanför': 'Outside the home',
  'Himlen': 'The sky',
  'Husdjursstugan': 'The pet house',
  'Hyllan': 'The shelf',
  'Hörnet': 'The corner',
  'Idag tog {{child_name}} sitt första steg.': 'Today {{child_name}} took a first step.',
  'In genom dörren': 'In through the door',
  'Kistan': 'The chest',
  'Kvitt! Den hoppar bort.': 'Squeak! It hops away.',
  'Köket': 'The kitchen',
  'Lampan': 'The lamp',
  'Ljuset vilar fortfarande.': 'The light is still resting.',
  'Läshörnan': 'The reading corner',
  'Mattan minns dina steg.': 'The mat remembers your steps.',
  'Minnesrummet': 'The memory room',
  'Minnesväggen': 'The memory wall',
  'Mjukt framsteg utan press eller streak': 'Gentle progress without pressure or streaks',
  'Morgonljus': 'Morning light',
  'Morgonljuset': 'The morning light',
  'Morgonsolen lyser in.': 'The morning sun shines in.',
  'Ner till hallen': 'Down to the hallway',
  'Plask — lite kallt och fräscht.': 'Splash — a little cold and fresh.',
  'Sjön': 'The lake',
  'Skattkistan': 'The treasure chest',
  'Skogen': 'The forest',
  'Snigeln på stenen': 'The snail on the stone',
  'Snigeln sticker ut huvudet.': 'The snail peeks out its head.',
  'Solrosen': 'The sunflower',
  'Solrosen blommar!': 'The sunflower is blooming!',
  'Sovrummet': 'The bedroom',
  'Spegeln': 'The mirror',
  'Stenarna glittrar under fötterna.': 'The stones sparkle under your feet.',
  'Stigen': 'The path',
  'Stigen till sjön': 'The path to the lake',
  'Stolt ögonblick — en prestation i taget, ingen trofévägg': 'A proud moment — one step at a time, not a trophy wall',
  'Swoosh — den dansar lite.': 'Swoosh — it dances a little.',
  'Sängen': 'The bed',
  'Takfönstret': 'The skylight',
  'Tallen': 'The pine tree',
  'Tillbaka till skogen': 'Back to the forest',
  'Tom jord': 'Empty soil',
  'Troféerna': 'The trophies',
  'Troférummet': 'The trophy room',
  'Trädgården': 'The garden',
  'Tvättställ': 'The washbasin',
  'Vattenkannan': 'The watering can',
  'Verkstaden': 'The workshop',
  'Vinden': 'The attic',
  'Välkommen hem!': 'Welcome home!',
  'Välkomstmatta': 'Welcome mat',
  'Välkomstmattan': 'The welcome mat',
};

function translateValue(key, value) {
  if (typeof value !== 'string' || !value.trim()) return value;
  if (!LOCALIZABLE_KEY.test(key)) return value;
  const en = TRANSLATIONS[value];
  if (!en) {
    throw new Error(`Missing translation for key "${key}": "${value}"`);
  }
  return en;
}

function deepTranslate(obj) {
  if (Array.isArray(obj)) return obj.map(deepTranslate);
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      out[k] = translateValue(k, v);
    } else if (v && typeof v === 'object') {
      out[k] = deepTranslate(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

let wrote = 0;
for (const file of FILES) {
  const sePath = path.join(SE_DIR, file);
  const enPath = path.join(EN_DIR, file);
  const se = JSON.parse(fs.readFileSync(sePath, 'utf8'));
  const en = deepTranslate(se);
  fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
  wrote++;
  console.log(`✓ ${file}`);
}
console.log(`Synced ${wrote} files to child_en`);
