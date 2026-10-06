'use strict';

/**
 * Canonical locale resolution.
 * Supported languages live in config/locale-catalog.json — not in route or market code.
 * Language (presentation) is independent of country and commercial policy.
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '..', '..', 'config', 'locale-catalog.json');

function readCatalogFile() {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
}

function compileCatalog(catalog) {
  const locales = Array.isArray(catalog.locales) ? catalog.locales : [];
  const ids = locales.map((locale) => locale.id);
  const byId = new Map(locales.map((locale) => [locale.id, locale]));
  const aliases = {};
  const baseToIds = new Map();
  const inputAliases = [];

  for (const locale of locales) {
    const baseHits = baseToIds.get(locale.base) || [];
    baseHits.push(locale.id);
    baseToIds.set(locale.base, baseHits);
    for (const alias of locale.aliases || []) {
      aliases[String(alias).toLowerCase()] = locale.id;
    }
    for (const alias of locale.inputAliases || []) {
      inputAliases.push(alias);
    }
  }

  return {
    ids,
    byId,
    aliases,
    baseToIds,
    inputAliases,
    defaultLocale: catalog.defaultLocale,
    fallbackLocale: catalog.fallbackLocale,
    publicLocales: locales.map((locale) => ({
      id: locale.id,
      nativeName: locale.nativeName,
      base: locale.base,
      availability: listedAvailability(locale),
      showOnFirstRun: shownOnFirstRun(locale),
      selectRequiresFeature: selectFeatureOf(locale),
      experiencePackRequiresFlag: locale.experiencePackRequiresFlag || null,
    })),
  };
}

function listedAvailability(locale) {
  const value = locale && locale.availability;
  if (value === 'public' || value === 'always' || value === 'english_app') return 'public';
  if (value === 'enabled') return 'enabled';
  return 'registered';
}

function selectFeatureOf(locale) {
  if (!locale) return null;
  if (locale.selectRequiresFeature) return locale.selectRequiresFeature;
  if (locale.availability === 'english_app') return 'english_app';
  return null;
}

function grantFeatureOf(locale) {
  if (!locale) return null;
  if (locale.grantFeatureOnRegister) return locale.grantFeatureOnRegister;
  if (locale.enableEnglishAppOnRegister) return 'english_app';
  return null;
}

function shownOnFirstRun(locale) {
  if (!locale) return false;
  const availability = listedAvailability(locale);
  if (availability === 'registered') return false;
  if (locale.showOnFirstRun === false) return false;
  if (locale.showOnFirstRun === true) return availability !== 'registered';
  return availability === 'public';
}

const shippedCatalog = readCatalogFile();
const shippedDerived = compileCatalog(shippedCatalog);

let derived = shippedDerived;

const SUPPORTED_LOCALES = Object.freeze([...shippedDerived.ids]);
const DEFAULT_LOCALE = shippedDerived.defaultLocale;
const CANONICAL_FALLBACK_LOCALE = shippedDerived.fallbackLocale;
const ALIASES = Object.freeze({ ...shippedDerived.aliases });
const LOCALE_INPUT_ALIASES = Object.freeze([...shippedDerived.inputAliases]);

/**
 * Test-only catalog swap. The exported sv-SE / en-GB list does not change.
 * @param {object} catalog
 * @param {() => unknown} fn
 */
function withLocaleCatalog(catalog, fn) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('withLocaleCatalog is only available when NODE_ENV=test');
  }
  const previous = derived;
  derived = compileCatalog(catalog);
  try {
    return fn();
  } finally {
    derived = previous;
  }
}

/**
 * Normalize a raw locale string to canonical BCP 47 or null if unrecognised.
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
function normalizeLocale(raw) {
  if (raw == null || raw === '') return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  if (derived.ids.includes(trimmed)) return trimmed;

  const alias = derived.aliases[trimmed.toLowerCase()];
  if (alias) return alias;

  const base = trimmed.split(/[-_]/)[0].toLowerCase();
  const matches = derived.baseToIds.get(base) || [];
  // One registered bundle per base language (fr-BE → fr-FR). Two bundles need an alias.
  if (matches.length === 1) return matches[0];
  return null;
}

/**
 * @param {string|null|undefined} raw
 * @returns {boolean}
 */
function isSupportedLocale(raw) {
  return normalizeLocale(raw) !== null;
}

/**
 * Validate and return canonical locale, or throw/return default.
 * @param {string|null|undefined} raw
 * @param {{ fallback?: string }} [opts]
 * @returns {string}
 */
function validateLocale(raw, opts = {}) {
  const normalized = normalizeLocale(raw);
  if (normalized) return normalized;
  const fallback = normalizeLocale(opts.fallback) || derived.defaultLocale;
  return fallback;
}

/**
 * Tag for Intl formatters. A syntactically valid BCP 47 tag is kept even
 * when it is not in the shipped catalog. Catalog matches still win.
 * @param {string|null|undefined} raw
 * @returns {string}
 */
function intlLocaleTag(raw) {
  const normalized = normalizeLocale(raw);
  if (normalized) return normalized;
  const text = raw == null ? '' : String(raw).trim().replace(/_/g, '-');
  if (text) {
    try {
      const [canonical] = Intl.getCanonicalLocales(text);
      if (canonical) return canonical;
    } catch (_) {
      /* not a BCP 47 tag */
    }
  }
  return validateLocale(derived.defaultLocale);
}

/**
 * Parse Accept-Language header to best supported locale.
 * @param {string|null|undefined} header
 * @returns {string|null}
 */
function parseAcceptLanguage(header) {
  if (!header || typeof header !== 'string') return null;

  const parts = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      let q = 1;
      for (const p of params) {
        const m = p.trim().match(/^q=([\d.]+)/);
        if (m) q = parseFloat(m[1]);
      }
      return { tag: tag.trim(), q };
    })
    .filter((p) => p.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parts) {
    const normalized = normalizeLocale(tag);
    if (normalized) return normalized;
    const base = tag.split('-')[0];
    const fromBase = normalizeLocale(base);
    if (fromBase) return fromBase;
  }

  return null;
}

/**
 * Resolve locale for an unauthenticated request (pre-family).
 * Order: explicit param/body → Accept-Language → default.
 * @param {{ explicit?: string|null, acceptLanguage?: string|null }} input
 * @returns {string}
 */
function resolvePreAuthLocale(input = {}) {
  const fromExplicit = normalizeLocale(input.explicit);
  if (fromExplicit) return fromExplicit;

  const fromHeader = parseAcceptLanguage(input.acceptLanguage);
  if (fromHeader) return fromHeader;

  return derived.defaultLocale;
}

/**
 * Resolve locale for an authenticated family context.
 * Uses family.preferred_locale only — never auto-changes after creation.
 * @param {string|null|undefined} familyPreferredLocale
 * @returns {string}
 */
function resolveFamilyLocale(familyPreferredLocale) {
  return validateLocale(familyPreferredLocale, { fallback: derived.defaultLocale });
}

function catalogEntry(locale) {
  return derived.byId.get(resolveFamilyLocale(locale)) || null;
}

/**
 * Swedish canonical library (admin DB) is only the default locale.
 * Every other registered locale uses its own content files, then English.
 * @param {string|null|undefined} locale
 * @returns {boolean}
 */
function usesCanonicalLibrary(locale) {
  const entry = catalogEntry(locale);
  return Boolean(entry && entry.contentSource === 'canonical-db');
}

/**
 * Non-default locales use locale files, then English. Not an English-only flag.
 * @param {string|null|undefined} locale
 * @returns {boolean}
 */
function usesLocaleFileContent(locale) {
  return !usesCanonicalLibrary(locale);
}

/**
 * English rollout flag is a property of the en-GB catalog row, not a locale branch in routes.
 * @param {string|null|undefined} locale
 * @returns {boolean}
 */
function catalogMeta(locale) {
  return derived.byId.get(normalizeLocale(locale)) || null;
}

function isPublicLocale(locale) {
  const entry = catalogMeta(locale);
  return Boolean(entry && listedAvailability(entry) === 'public');
}

/**
 * Feature slug to grant when a family is created in this locale.
 * Empty for languages that do not need a rollout flag.
 * @param {string|null|undefined} locale
 * @returns {string|null}
 */
function featureGrantedOnRegister(locale) {
  return grantFeatureOf(catalogMeta(locale));
}

function shouldEnableEnglishAppOnRegister(locale) {
  return featureGrantedOnRegister(locale) === 'english_app';
}

/**
 * Locale saved on a new family.
 * explicit choice → stored/header language → market default → catalog default.
 * Only public locales are chosen automatically. An explicit tag may be any registered locale.
 * @param {{ explicit?: string|null, acceptLanguage?: string|null, marketDefaultLocale?: string|null }} [input]
 * @returns {{ locale: string, source: 'explicit'|'accept_language'|'market_default'|'fallback' }}
 */
function resolveAccountLocale(input = {}) {
  const explicit = normalizeLocale(input.explicit);
  if (explicit) return { locale: explicit, source: 'explicit' };

  const fromHeader = parseAcceptLanguage(input.acceptLanguage);
  if (fromHeader && isPublicLocale(fromHeader)) {
    return { locale: fromHeader, source: 'accept_language' };
  }

  const marketDefault = normalizeLocale(input.marketDefaultLocale);
  if (marketDefault && isPublicLocale(marketDefault)) {
    return { locale: marketDefault, source: 'market_default' };
  }

  return { locale: derived.defaultLocale, source: 'fallback' };
}

function firstRunLocales() {
  return derived.publicLocales.filter((locale) => locale.showOnFirstRun).map((locale) => ({ ...locale }));
}

/**
 * Map family locale to journey_experience_registry locale column.
 * Legacy rows may use 'sv'; new rows use 'sv-SE'.
 * @param {string} familyLocale
 * @returns {string[]}
 */
function journeyLocaleCandidates(familyLocale) {
  const canonical = resolveFamilyLocale(familyLocale);
  const entry = derived.byId.get(canonical);
  const candidates = [canonical];
  for (const tag of (entry && entry.legacyJourneyTags) || []) {
    if (!candidates.includes(tag)) candidates.push(tag);
  }
  return candidates;
}

/**
 * Map family locale to experience pack id.
 * en-GB selects child_en only when english_child_experience is enabled for the family.
 * A future locale uses its catalog pack and never the Swedish pack.
 * @param {string} familyLocale
 * @param {{ englishChildExperienceEnabled?: boolean }} [opts]
 * @returns {string}
 */
/**
 * Child UI bundle. en-GB stays behind english_child_experience.
 * Any other non-default locale uses itself (never Swedish copy).
 * @param {string|null|undefined} familyLocale
 * @param {boolean} [englishChildEnabled]
 * @returns {string}
 */
function childUiLocaleForFamily(familyLocale, englishChildEnabled = false) {
  const canonical = resolveFamilyLocale(familyLocale);
  const entry = derived.byId.get(canonical);
  if (!entry || canonical === derived.defaultLocale) return derived.defaultLocale;
  if (entry.experiencePackRequiresFlag === 'english_child_experience') {
    return englishChildEnabled === true ? canonical : derived.defaultLocale;
  }
  return canonical;
}

function experiencePackIdForLocale(familyLocale, opts = {}) {
  const canonical = resolveFamilyLocale(familyLocale);
  const entry = derived.byId.get(canonical);
  if (!entry) return 'child_se';
  if (entry.experiencePackRequiresFlag === 'english_child_experience') {
    return opts.englishChildExperienceEnabled === true ? entry.experiencePack : 'child_se';
  }
  return entry.experiencePack || 'child_se';
}

/**
 * BCP 47 → HTML lang attribute (lowercase region).
 * @param {string} locale
 * @returns {string}
 */
function htmlLang(locale) {
  const canonical = validateLocale(locale);
  return canonical.toLowerCase();
}

/**
 * Names shown in the language selector. Availability flags stay per locale.
 * @returns {Array<{ id: string, nativeName: string, availability: string }>}
 */
function getPublicLocaleCatalog() {
  return derived.publicLocales.map((locale) => ({ ...locale }));
}

module.exports = {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  CANONICAL_FALLBACK_LOCALE,
  ALIASES,
  LOCALE_INPUT_ALIASES,
  normalizeLocale,
  isSupportedLocale,
  validateLocale,
  parseAcceptLanguage,
  resolvePreAuthLocale,
  resolveFamilyLocale,
  usesCanonicalLibrary,
  usesLocaleFileContent,
  intlLocaleTag,
  isPublicLocale,
  featureGrantedOnRegister,
  shouldEnableEnglishAppOnRegister,
  resolveAccountLocale,
  firstRunLocales,
  journeyLocaleCandidates,
  childUiLocaleForFamily,
  experiencePackIdForLocale,
  htmlLang,
  getPublicLocaleCatalog,
  withLocaleCatalog,
};
