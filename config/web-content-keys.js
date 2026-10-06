'use strict';

/**
 * contentKey → locale slug.
 * Hreflang uses this identity, not a shared slug.
 *
 * Dutch pilot slugs:
 *   home                         /nl
 *   howItWorks                   /nl/hoe-het-werkt
 *   visualSchedule               /nl/visueel-schema
 *   morningRoutine               /nl/ochtendroutine-kinderen
 *   weeklySchedule               /nl/weekplanning-met-pictogrammen
 *   neurodiverseRoutines         /nl/routines-neurodiverse-kinderen
 *   rewardSystem                 /nl/beloningssysteem-kinderen
 *   resources                    /nl/bronnen
 *   faq                          /nl/faq
 *   privacy                      /nl/privacy
 *   terms                        /nl/voorwaarden
 */

const { LOCALES, REQUIRED_SEO_CONTENT, localeByCode, normalizeWebPath } = require('./web-locales');
const { chromeFor } = require('./web-locale-chrome');
const { MARKETS, campaignPath } = require('./web-markets');

const CONTENT_KEYS = Object.freeze([
  Object.freeze({
    key: 'home',
    indexable: true,
    paths: Object.freeze({ sv: '/', en: '/en', nl: '/nl' }),
  }),
  Object.freeze({
    key: 'howItWorks',
    indexable: true,
    paths: Object.freeze({ en: '/en/how-it-works', nl: '/nl/hoe-het-werkt' }),
  }),
  Object.freeze({
    key: 'visualSchedule',
    indexable: true,
    paths: Object.freeze({ sv: '/bildschema-app', en: '/en/visual-schedule-app', nl: '/nl/visueel-schema' }),
  }),
  Object.freeze({
    key: 'morningRoutine',
    indexable: true,
    paths: Object.freeze({ sv: '/morgonrutin-barn', en: '/en/morning-routine-children', nl: '/nl/ochtendroutine-kinderen' }),
  }),
  Object.freeze({
    key: 'weeklySchedule',
    indexable: true,
    paths: Object.freeze({ sv: '/veckoschema-bildstod', en: '/en/weekly-schedule-visual-support', nl: '/nl/weekplanning-met-pictogrammen' }),
  }),
  Object.freeze({
    key: 'neurodiverseRoutines',
    indexable: true,
    paths: Object.freeze({ sv: '/rutiner-npf-barn', en: '/en/routines-neurodiverse-children', nl: '/nl/routines-neurodiverse-kinderen' }),
  }),
  Object.freeze({
    key: 'rewardSystem',
    indexable: true,
    paths: Object.freeze({ sv: '/beloningssystem-barn', en: '/en/reward-system-children', nl: '/nl/beloningssysteem-kinderen' }),
  }),
  Object.freeze({
    key: 'resources',
    indexable: true,
    paths: Object.freeze({ sv: '/resurser', en: '/en/resources', nl: '/nl/bronnen' }),
  }),
  Object.freeze({
    key: 'faq',
    indexable: true,
    paths: Object.freeze({ sv: '/faq', en: '/en/faq', nl: '/nl/faq' }),
  }),
  Object.freeze({
    key: 'privacy',
    indexable: true,
    paths: Object.freeze({ sv: '/privacy', en: '/en/privacy', nl: '/nl/privacy' }),
  }),
  Object.freeze({
    key: 'terms',
    indexable: true,
    paths: Object.freeze({ sv: '/terms', en: '/en/terms', nl: '/nl/voorwaarden' }),
  }),
]);

const BY_PATH = new Map();
const BY_KEY = new Map();

function assertNoMarketCollision() {
  for (const entry of CONTENT_KEYS) {
    for (const [localeCode, contentPath] of Object.entries(entry.paths)) {
      const locale = localeByCode(localeCode);
      if (!locale) throw new Error(`Unknown locale on ${entry.key}: ${localeCode}`);
      const norm = normalizeWebPath(contentPath);
      if (BY_PATH.has(norm)) {
        throw new Error(`Duplicate public path ${norm}`);
      }
      BY_PATH.set(norm, entry);
      for (const market of Object.values(MARKETS)) {
        const reserved = campaignPath(market, localeCode);
        if (reserved && reserved === norm) {
          throw new Error(`Content ${entry.key} collides with market ${market.code} at ${norm}`);
        }
      }
    }
  }
  for (const entry of CONTENT_KEYS) BY_KEY.set(entry.key, entry);
}

assertNoMarketCollision();

function contentByKey(key) {
  return BY_KEY.get(key) || null;
}

function contentByPath(pathname) {
  return BY_PATH.get(normalizeWebPath(pathname)) || null;
}

function pathFor(key, localeCode) {
  const entry = contentByKey(key);
  if (!entry) return null;
  return entry.paths[localeCode] || null;
}

function localeHasSeoChrome(localeCode) {
  const locale = LOCALES[localeCode];
  if (!locale || !locale.enabled || !locale.seoEnabled || !locale.publicWeb) return false;
  const chrome = chromeFor(localeCode);
  if (!chrome || !chrome.languageLabel || !chrome.marketLabel || !chrome.home || !chrome.primaryCta || !chrome.footer) {
    return false;
  }
  for (const key of REQUIRED_SEO_CONTENT) {
    const entry = BY_KEY.get(key);
    if (!entry || !entry.paths[localeCode]) return false;
  }
  return true;
}

function indexablePathsForLocale(localeCode) {
  if (!localeHasSeoChrome(localeCode)) return [];
  return CONTENT_KEYS
    .filter((entry) => entry.indexable && entry.paths[localeCode])
    .map((entry) => entry.paths[localeCode]);
}

function localeAlternates() {
  return CONTENT_KEYS.map((entry) => ({
    key: entry.key,
    sv: entry.paths.sv || null,
    en: entry.paths.en || null,
    nl: entry.paths.nl || null,
  }));
}

module.exports = {
  CONTENT_KEYS,
  contentByKey,
  contentByPath,
  pathFor,
  localeHasSeoChrome,
  indexablePathsForLocale,
  localeAlternates,
};
