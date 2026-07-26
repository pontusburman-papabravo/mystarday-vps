'use strict';

/**
 * Central registry: Swedish public pages → English mirrors.
 * Used by mirror script, routing, lang switcher, and SEO index.
 */

const { PUBLIC_WEB_ROUTES } = require('./public-web-routes');
const { translatePublicPath } = require('./en-slug-words');
const { R1_CATEGORY_PAGES, R1_BILDKORT_PAGES, R1_PDF_PAGES } = require('./resurser-r1');
const { R2_CATEGORY_PAGES, R2_BILDKORT_PAGES, R2_PDF_PAGES } = require('./resurser-r2');
const { R3_LONGTAIL_PAGES, R3_PDF_PAGES } = require('./resurser-r3');

/** Core static pages not covered by resurser configs. */
const CORE_MIRROR_PAGES = [
  { sv: '/resurser', en: '/en/resources', fileSv: 'resurser.html', fileEn: 'en/resources.html' },
  { sv: '/pedagoger-och-terapeuter', en: '/en/educators-and-therapists', fileSv: 'pedagoger-och-terapeuter.html', fileEn: 'en/educators-and-therapists.html' },
  { sv: '/skattkammaren', en: '/en/treasury', fileSv: 'skattkammaren.html', fileEn: 'en/treasury.html' },
  { sv: '/sv/tack', en: '/en/thank-you', fileSv: 'sv-tack.html', fileEn: 'en/thank-you.html' },
  { sv: '/morgonrutin-barn', en: '/en/morning-routine-children', fileSv: 'morgonrutin-barn.html', fileEn: 'en/morning-routine-children.html' },
  { sv: '/beloningssystem-barn', en: '/en/reward-system-children', fileSv: 'beloningssystem-barn.html', fileEn: 'en/reward-system-children.html' },
  { sv: '/rutiner-npf-barn', en: '/en/routines-neurodiverse-children', fileSv: 'rutiner-npf-barn.html', fileEn: 'en/routines-neurodiverse-children.html' },
  { sv: '/bildschema-app', en: '/en/visual-schedule-app', fileSv: 'bildschema-app.html', fileEn: 'en/visual-schedule-app.html' },
  { sv: '/alternativ-bildschema-tavla', en: '/en/alternative-visual-schedule-board', fileSv: 'alternativ-bildschema-tavla.html', fileEn: 'en/alternative-visual-schedule-board.html' },
  { sv: '/veckoschema-bildstod', en: '/en/weekly-schedule-visual-support', fileSv: 'veckoschema-bildstod.html', fileEn: 'en/weekly-schedule-visual-support.html' },
];

function resurserMirrorEntry(page) {
  const enPath = translatePublicPath(page.path);
  if (!enPath) return null;
  const fileEn = enPath === '/en/resources'
    ? 'en/resources.html'
    : `en${enPath.slice(3)}.html`;
  return {
    sv: page.path,
    en: enPath,
    fileSv: page.file,
    fileEn,
  };
}

function buildResurserMirrors() {
  const pages = [
    ...R1_CATEGORY_PAGES,
    ...R1_BILDKORT_PAGES,
    ...R1_PDF_PAGES,
    ...R2_CATEGORY_PAGES,
    ...R2_BILDKORT_PAGES,
    ...R2_PDF_PAGES,
    ...R3_LONGTAIL_PAGES,
    ...R3_PDF_PAGES,
  ];
  return pages.map(resurserMirrorEntry).filter(Boolean);
}

function buildWebRouteMirrors() {
  return PUBLIC_WEB_ROUTES
    .filter((r) => r.sv !== '/' && !['register.html', 'login.html', 'forgot-password.html'].includes(r.fileEn))
    .map((r) => ({
      sv: r.sv,
      en: r.en,
      fileSv: r.fileSv,
      fileEn: r.fileEn,
    }));
}

/** All mirror entries (deduped by sv path). */
function buildMirrorEntries() {
  const bySv = new Map();
  const all = [
    ...buildWebRouteMirrors(),
    ...CORE_MIRROR_PAGES,
    ...buildResurserMirrors(),
  ];
  for (const entry of all) {
    bySv.set(entry.sv, entry);
  }
  return [...bySv.values()];
}

/** Files with hand-translated English — skip auto-mirror overwrite. */
const HAND_TRANSLATED_EN_FILES = new Set([
  'en-faq.html',
  'en-contact.html',
  'en-privacy.html',
  'en-terms.html',
  'en.html',
  'en/thank-you.html',
]);

const MIRROR_ENTRIES = buildMirrorEntries();

function svToEn(svPath) {
  const norm = svPath.replace(/\/$/, '') || '/';
  const entry = MIRROR_ENTRIES.find((e) => e.sv === norm);
  if (entry) return entry.en;
  return translatePublicPath(norm);
}

function enToSv(enPath) {
  const norm = enPath.replace(/\/$/, '') || '/';
  const entry = MIRROR_ENTRIES.find((e) => e.en === norm);
  if (entry) return entry.sv;
  if (norm === '/en') return '/';
  return null;
}

function buildLangRoutesMap() {
  const map = { '/': '/en', '/en': '/' };
  for (const { sv, en } of MIRROR_ENTRIES) {
    map[sv] = en;
    map[en] = sv;
  }
  return map;
}

function allEnglishIndexablePaths() {
  return MIRROR_ENTRIES.map((e) => e.en);
}

module.exports = {
  CORE_MIRROR_PAGES,
  MIRROR_ENTRIES,
  HAND_TRANSLATED_EN_FILES,
  buildMirrorEntries,
  svToEn,
  enToSv,
  buildLangRoutesMap,
  allEnglishIndexablePaths,
};
