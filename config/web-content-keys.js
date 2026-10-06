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

/**
 * Localized slugs for published path locales after Dutch.
 * A slug must not collide with a market segment (/de/de is Germany, not a guide).
 */
const LOCALE_PATHS = Object.freeze({
  de: Object.freeze({
    home: '/de',
    howItWorks: '/de/so-funktionierts',
    visualSchedule: '/de/visueller-tagesplan',
    morningRoutine: '/de/morgenroutine-kinder',
    weeklySchedule: '/de/wochenplan-piktogramme',
    neurodiverseRoutines: '/de/routinen-neurodiverse-kinder',
    rewardSystem: '/de/belohnungssystem-kinder',
    resources: '/de/materialien',
    faq: '/de/fragen',
    privacy: '/de/datenschutz',
    terms: '/de/nutzungsbedingungen',
  }),
  fr: Object.freeze({
    home: '/fr',
    howItWorks: '/fr/comment-ca-marche',
    visualSchedule: '/fr/emploi-du-temps-visuel',
    morningRoutine: '/fr/routine-du-matin',
    weeklySchedule: '/fr/planning-hebdomadaire',
    neurodiverseRoutines: '/fr/routines-enfants-neurodivergents',
    rewardSystem: '/fr/systeme-de-recompenses',
    resources: '/fr/ressources',
    faq: '/fr/questions-frequentes',
    privacy: '/fr/confidentialite',
    terms: '/fr/conditions-d-utilisation',
  }),
  es: Object.freeze({
    home: '/es',
    howItWorks: '/es/como-funciona',
    visualSchedule: '/es/horario-visual',
    morningRoutine: '/es/rutina-matinal',
    weeklySchedule: '/es/plan-semanal',
    neurodiverseRoutines: '/es/rutinas-ninos-neurodivergentes',
    rewardSystem: '/es/sistema-de-recompensas',
    resources: '/es/recursos',
    faq: '/es/preguntas-frecuentes',
    privacy: '/es/privacidad',
    terms: '/es/condiciones',
  }),
  it: Object.freeze({
    home: '/it',
    howItWorks: '/it/come-funziona',
    visualSchedule: '/it/schema-visivo',
    morningRoutine: '/it/routine-del-mattino',
    weeklySchedule: '/it/piano-settimanale',
    neurodiverseRoutines: '/it/routine-bambini-neurodivergenti',
    rewardSystem: '/it/sistema-di-ricompense',
    resources: '/it/risorse',
    faq: '/it/domande-frequenti',
    privacy: '/it/privacy',
    terms: '/it/condizioni',
  }),
  pl: Object.freeze({
    home: '/pl',
    howItWorks: '/pl/jak-to-dziala',
    visualSchedule: '/pl/plan-dnia-obrazkowy',
    morningRoutine: '/pl/poranna-rutyna',
    weeklySchedule: '/pl/plan-tygodnia',
    neurodiverseRoutines: '/pl/rutyny-dzieci-neuroroznorodnych',
    rewardSystem: '/pl/system-nagrod',
    resources: '/pl/materialy',
    faq: '/pl/pytania',
    privacy: '/pl/prywatnosc',
    terms: '/pl/regulamin',
  }),
});

function pathsFor(key, base) {
  const paths = { ...base };
  for (const [localeCode, slugs] of Object.entries(LOCALE_PATHS)) {
    if (slugs[key]) paths[localeCode] = slugs[key];
  }
  return Object.freeze(paths);
}
const { chromeFor } = require('./web-locale-chrome');
const { MARKETS, campaignPath } = require('./web-markets');

const CONTENT_KEYS = Object.freeze([
  Object.freeze({
    key: 'home',
    indexable: true,
    paths: pathsFor('home', { sv: '/', en: '/en', nl: '/nl' }),
  }),
  Object.freeze({
    key: 'howItWorks',
    indexable: true,
    paths: pathsFor('howItWorks', { en: '/en/how-it-works', nl: '/nl/hoe-het-werkt' }),
  }),
  Object.freeze({
    key: 'visualSchedule',
    indexable: true,
    paths: pathsFor('visualSchedule', { sv: '/bildschema-app', en: '/en/visual-schedule-app', nl: '/nl/visueel-schema' }),
  }),
  Object.freeze({
    key: 'morningRoutine',
    indexable: true,
    paths: pathsFor('morningRoutine', { sv: '/morgonrutin-barn', en: '/en/morning-routine-children', nl: '/nl/ochtendroutine-kinderen' }),
  }),
  Object.freeze({
    key: 'weeklySchedule',
    indexable: true,
    paths: pathsFor('weeklySchedule', { sv: '/veckoschema-bildstod', en: '/en/weekly-schedule-visual-support', nl: '/nl/weekplanning-met-pictogrammen' }),
  }),
  Object.freeze({
    key: 'neurodiverseRoutines',
    indexable: true,
    paths: pathsFor('neurodiverseRoutines', { sv: '/rutiner-npf-barn', en: '/en/routines-neurodiverse-children', nl: '/nl/routines-neurodiverse-kinderen' }),
  }),
  Object.freeze({
    key: 'rewardSystem',
    indexable: true,
    paths: pathsFor('rewardSystem', { sv: '/beloningssystem-barn', en: '/en/reward-system-children', nl: '/nl/beloningssysteem-kinderen' }),
  }),
  Object.freeze({
    key: 'resources',
    indexable: true,
    paths: pathsFor('resources', { sv: '/resurser', en: '/en/resources', nl: '/nl/bronnen' }),
  }),
  Object.freeze({
    key: 'faq',
    indexable: true,
    paths: pathsFor('faq', { sv: '/faq', en: '/en/faq', nl: '/nl/faq' }),
  }),
  Object.freeze({
    key: 'privacy',
    indexable: true,
    paths: pathsFor('privacy', { sv: '/privacy', en: '/en/privacy', nl: '/nl/privacy' }),
  }),
  Object.freeze({
    key: 'terms',
    indexable: true,
    paths: pathsFor('terms', { sv: '/terms', en: '/en/terms', nl: '/nl/voorwaarden' }),
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

function alternateCodes() {
  const codes = new Set();
  for (const entry of CONTENT_KEYS) {
    Object.keys(entry.paths).forEach((code) => codes.add(code));
  }
  const head = ['sv', 'en', 'nl'].filter((code) => codes.has(code));
  const rest = [...codes].filter((code) => !head.includes(code)).sort();
  return [...head, ...rest];
}

function localeAlternates() {
  const codes = alternateCodes();
  return CONTENT_KEYS.map((entry) => {
    const row = { key: entry.key };
    for (const code of codes) row[code] = entry.paths[code] || null;
    return row;
  });
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
