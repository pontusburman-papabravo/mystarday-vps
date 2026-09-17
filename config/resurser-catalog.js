'use strict';

/**
 * Canonical resource-library catalog.
 * Paths, PDF variants, and which downloads belong on which page.
 * Copy lives in config/i18n/resurser-*.json (sv-SE / en-GB).
 */

const { translateSlug } = require('./en-slug-words');
const { MORNING_KEYS, EVENING_KEYS } = require('./resurser-r1');
const {
  EMOTION_KEYS,
  TRANSITION_KEYS,
  TEACCH_KEYS,
  SCHOOL_KEYS,
  HYGIENE_KEYS,
} = require('./resurser-r2');
const { WEEKEND_KEYS, HOMEWORK_KEYS } = require('./resurser-r3-pdf-keys');

function enPdfFilename(fileSv) {
  return `${translateSlug(String(fileSv).replace(/\.pdf$/i, ''))}.pdf`;
}

const LOCALES = ['sv-SE', 'en-GB'];

/** PDF binaries shipped for each locale. fileSv stays the public Swedish filename. */
const PDF_ASSETS = [
  { id: 'morning-blank', type: 'schedule', keys: MORNING_KEYS, emptyBoxes: true, fileSv: 'morgonschema.pdf' },
  { id: 'morning-example', type: 'schedule', keys: MORNING_KEYS, emptyBoxes: false, fileSv: 'morgonschema-exempel.pdf' },
  { id: 'morning-cards', type: 'bildkort', keys: MORNING_KEYS, fileSv: 'bildkort-morgon.pdf' },
  { id: 'evening-blank', type: 'schedule', keys: EVENING_KEYS, emptyBoxes: true, fileSv: 'kvallsschema.pdf' },
  { id: 'evening-example', type: 'schedule', keys: EVENING_KEYS, emptyBoxes: false, fileSv: 'kvallsschema-exempel.pdf' },
  { id: 'evening-cards', type: 'bildkort', keys: EVENING_KEYS, fileSv: 'bildkort-kvall.pdf' },
  { id: 'emotion-cards', type: 'bildkort', keys: EMOTION_KEYS, fileSv: 'bildkort-kanslor.pdf' },
  { id: 'transition-blank', type: 'schedule', keys: TRANSITION_KEYS, emptyBoxes: true, fileSv: 'overgangsschema.pdf' },
  { id: 'transition-example', type: 'schedule', keys: TRANSITION_KEYS, emptyBoxes: false, fileSv: 'overgangsschema-exempel.pdf' },
  { id: 'transition-cards', type: 'bildkort', keys: TRANSITION_KEYS, fileSv: 'bildkort-overgangar.pdf' },
  { id: 'teacch-cards', type: 'bildkort', keys: TEACCH_KEYS, fileSv: 'bildkort-teacch.pdf' },
  { id: 'school-blank', type: 'schedule', keys: SCHOOL_KEYS, emptyBoxes: true, fileSv: 'skolaschema.pdf' },
  { id: 'school-example', type: 'schedule', keys: SCHOOL_KEYS, emptyBoxes: false, fileSv: 'skolaschema-exempel.pdf' },
  { id: 'school-cards', type: 'bildkort', keys: SCHOOL_KEYS, fileSv: 'bildkort-skola.pdf' },
  { id: 'hygiene-blank', type: 'schedule', keys: HYGIENE_KEYS, emptyBoxes: true, fileSv: 'hygienschema.pdf' },
  { id: 'hygiene-example', type: 'schedule', keys: HYGIENE_KEYS, emptyBoxes: false, fileSv: 'hygienschema-exempel.pdf' },
  { id: 'hygiene-cards', type: 'bildkort', keys: HYGIENE_KEYS, fileSv: 'bildkort-hygien.pdf' },
  { id: 'reward-chart', type: 'beloning', fileSv: 'beloningsschema.pdf' },
  { id: 'weekly-blank', type: 'veckoschema', fileSv: 'veckoschema.pdf' },
  { id: 'weekly-example', type: 'veckoschema', exampleLabelsKey: 'weeklyExampleRow', fileSv: 'veckoschema-exempel.pdf' },
  { id: 'weekend-example', type: 'schedule', keys: WEEKEND_KEYS, emptyBoxes: false, fileSv: 'helgschema.pdf' },
  { id: 'homework-example', type: 'schedule', keys: HOMEWORK_KEYS, emptyBoxes: false, fileSv: 'laxschema.pdf' },
].map((asset) => Object.assign({}, asset, { fileEn: enPdfFilename(asset.fileSv) }));

const CATEGORIES = [
  { id: 'morning', pathSv: '/resurser/morgon', pathEn: '/en/resources/morning', fileSv: 'resurser/morgon.html', fileEn: 'en/resources/morning.html', bildkortPathSv: '/resurser/bildkort/morgon', bildkortPathEn: '/en/resources/picture-cards/morning', downloads: ['morning-blank', 'morning-example', 'morning-cards'], related: ['evening', 'hub'] },
  { id: 'evening', pathSv: '/resurser/kvall', pathEn: '/en/resources/evening', fileSv: 'resurser/kvall.html', fileEn: 'en/resources/evening.html', bildkortPathSv: '/resurser/bildkort/kvall', bildkortPathEn: '/en/resources/picture-cards/evening', downloads: ['evening-blank', 'evening-example', 'evening-cards'], related: ['morning', 'hub'] },
  { id: 'emotions', pathSv: '/resurser/kanslor', pathEn: '/en/resources/emotions', fileSv: 'resurser/kanslor.html', fileEn: 'en/resources/emotions.html', bildkortPathSv: '/resurser/bildkort/kanslor', bildkortPathEn: '/en/resources/picture-cards/emotions', downloads: ['emotion-cards'], related: ['transitions', 'hub'] },
  { id: 'transitions', pathSv: '/resurser/overgangar', pathEn: '/en/resources/transitions', fileSv: 'resurser/overgangar.html', fileEn: 'en/resources/transitions.html', bildkortPathSv: '/resurser/bildkort/overgangar', bildkortPathEn: '/en/resources/picture-cards/transitions', downloads: ['transition-blank', 'transition-example', 'transition-cards'], related: ['teacch', 'hub'] },
  { id: 'teacch', pathSv: '/resurser/teacch-inspirerat', pathEn: '/en/resources/teacch-inspired', fileSv: 'resurser/teacch-inspirerat.html', fileEn: 'en/resources/teacch-inspired.html', bildkortPathSv: '/resurser/bildkort/teacch-inspirerat', bildkortPathEn: '/en/resources/picture-cards/teacch-inspired', downloads: ['teacch-cards'], related: ['transitions', 'hub'] },
  { id: 'school', pathSv: '/resurser/skola', pathEn: '/en/resources/school', fileSv: 'resurser/skola.html', fileEn: 'en/resources/school.html', bildkortPathSv: '/resurser/bildkort/skola', bildkortPathEn: '/en/resources/picture-cards/school', downloads: ['school-blank', 'school-example', 'school-cards'], related: ['morning', 'hub'] },
  { id: 'hygiene', pathSv: '/resurser/hygien', pathEn: '/en/resources/hygiene', fileSv: 'resurser/hygien.html', fileEn: 'en/resources/hygiene.html', bildkortPathSv: '/resurser/bildkort/hygien', bildkortPathEn: '/en/resources/picture-cards/hygiene', downloads: ['hygiene-blank', 'hygiene-example', 'hygiene-cards'], related: ['morning', 'evening'] },
];

const BILDKORT_PAGES = CATEGORIES.map((c) => ({
  id: c.id,
  pathSv: c.bildkortPathSv,
  pathEn: c.bildkortPathEn,
  fileSv: `resurser/bildkort-${c.id === 'teacch' ? 'teacch-inspirerat' : c.id === 'emotions' ? 'kanslor' : c.id === 'transitions' ? 'overgangar' : c.id === 'morning' ? 'morgon' : c.id === 'evening' ? 'kvall' : c.id === 'school' ? 'skola' : 'hygien'}.html`,
  fileEn: `en${c.bildkortPathEn.slice(3)}.html`,
  pdfId: c.downloads.find((id) => PDF_ASSETS.find((a) => a.id === id && a.type === 'bildkort')),
  categoryId: c.id,
}));

const PDF_LANDINGS = [
  { id: 'morning-schedule', pathSv: '/resurser/pdf/morgonschema', pathEn: '/en/resources/pdf/morning-schedule', fileSv: 'resurser/pdf-morgonschema.html', fileEn: 'en/resources/pdf/morning-schedule.html', downloads: ['morning-blank', 'morning-example', 'morning-cards'], categoryId: 'morning' },
  { id: 'evening-schedule', pathSv: '/resurser/pdf/kvallsschema', pathEn: '/en/resources/pdf/evening-schedule', fileSv: 'resurser/pdf-kvallsschema.html', fileEn: 'en/resources/pdf/evening-schedule.html', downloads: ['evening-blank', 'evening-example', 'evening-cards'], categoryId: 'evening' },
  { id: 'emotions', pathSv: '/resurser/pdf/kanslor', pathEn: '/en/resources/pdf/emotions', fileSv: 'resurser/pdf-kanslor.html', fileEn: 'en/resources/pdf/emotions.html', downloads: ['emotion-cards'], categoryId: 'emotions' },
  { id: 'transitions', pathSv: '/resurser/pdf/overgangar', pathEn: '/en/resources/pdf/transitions', fileSv: 'resurser/pdf-overgangar.html', fileEn: 'en/resources/pdf/transitions.html', downloads: ['transition-blank', 'transition-example', 'transition-cards'], categoryId: 'transitions' },
  { id: 'teacch', pathSv: '/resurser/pdf/teacch-inspirerat', pathEn: '/en/resources/pdf/teacch-inspired', fileSv: 'resurser/pdf-teacch-inspirerat.html', fileEn: 'en/resources/pdf/teacch-inspired.html', downloads: ['teacch-cards'], categoryId: 'teacch' },
  { id: 'school', pathSv: '/resurser/pdf/skola', pathEn: '/en/resources/pdf/school', fileSv: 'resurser/pdf-skola.html', fileEn: 'en/resources/pdf/school.html', downloads: ['school-blank', 'school-example', 'school-cards'], categoryId: 'school' },
  { id: 'hygiene', pathSv: '/resurser/pdf/hygien', pathEn: '/en/resources/pdf/hygiene', fileSv: 'resurser/pdf-hygien.html', fileEn: 'en/resources/pdf/hygiene.html', downloads: ['hygiene-blank', 'hygiene-example', 'hygiene-cards'], categoryId: 'hygiene' },
  { id: 'reward-chart', pathSv: '/resurser/pdf/beloningsschema', pathEn: '/en/resources/pdf/reward-chart', fileSv: 'resurser/pdf-beloningsschema.html', fileEn: 'en/resources/pdf/reward-chart.html', downloads: ['reward-chart'] },
  { id: 'weekly-schedule', pathSv: '/resurser/pdf/veckoschema', pathEn: '/en/resources/pdf/weekly-schedule', fileSv: 'resurser/pdf-veckoschema.html', fileEn: 'en/resources/pdf/weekly-schedule.html', downloads: ['weekly-blank', 'weekly-example'] },
  { id: 'weekend-schedule', pathSv: '/resurser/pdf/helgschema', pathEn: '/en/resources/pdf/weekend-schedule', fileSv: 'resurser/pdf-helgschema.html', fileEn: 'en/resources/pdf/weekend-schedule.html', downloads: ['weekend-example'] },
  { id: 'homework-schedule', pathSv: '/resurser/pdf/laxschema', pathEn: '/en/resources/pdf/homework-schedule', fileSv: 'resurser/pdf-laxschema.html', fileEn: 'en/resources/pdf/homework-schedule.html', downloads: ['homework-example'] },
];

const HUB = {
  pathSv: '/resurser',
  pathEn: '/en/resources',
  fileSv: 'resurser.html',
  fileEn: 'en/resources.html',
  otherLandings: ['reward-chart', 'weekly-schedule', 'weekend-schedule', 'homework-schedule'],
};

function pdfById(id) {
  return PDF_ASSETS.find((a) => a.id === id) || null;
}

function pdfPublicPath(asset, locale) {
  if (locale === 'en-GB') return `/en/resources/pdf/${asset.fileEn}`;
  return `/resurser/pdf/${asset.fileSv}`;
}

function filenameToAsset(filename) {
  const name = String(filename || '');
  return PDF_ASSETS.find((a) => a.fileSv === name || a.fileEn === name) || null;
}

function englishFilenameFor(filename) {
  const asset = filenameToAsset(filename);
  return asset ? asset.fileEn : null;
}

function swedishFilenameFor(filename) {
  const asset = filenameToAsset(filename);
  return asset ? asset.fileSv : null;
}

function generatedEnHtmlFiles() {
  const files = [HUB.fileEn];
  for (const c of CATEGORIES) files.push(c.fileEn);
  for (const b of BILDKORT_PAGES) files.push(b.fileEn);
  for (const p of PDF_LANDINGS) files.push(p.fileEn);
  return files;
}

function generatedSvHtmlFiles() {
  const files = [HUB.fileSv];
  for (const c of CATEGORIES) files.push(c.fileSv);
  for (const b of BILDKORT_PAGES) files.push(b.fileSv);
  for (const p of PDF_LANDINGS) files.push(p.fileSv);
  return files;
}

function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

function landingById(id) {
  return PDF_LANDINGS.find((p) => p.id === id) || null;
}

function allPictogramKeys() {
  const keys = new Set();
  for (const asset of PDF_ASSETS) {
    if (asset.keys) asset.keys.forEach((k) => keys.add(k));
  }
  return [...keys];
}

module.exports = {
  LOCALES,
  PDF_ASSETS,
  CATEGORIES,
  BILDKORT_PAGES,
  PDF_LANDINGS,
  HUB,
  pdfById,
  pdfPublicPath,
  filenameToAsset,
  englishFilenameFor,
  swedishFilenameFor,
  generatedEnHtmlFiles,
  generatedSvHtmlFiles,
  categoryById,
  landingById,
  allPictogramKeys,
  enPdfFilename,
  MORNING_KEYS,
  EVENING_KEYS,
  EMOTION_KEYS,
  TRANSITION_KEYS,
  TEACCH_KEYS,
  SCHOOL_KEYS,
  HYGIENE_KEYS,
  WEEKEND_KEYS,
  HOMEWORK_KEYS,
};
