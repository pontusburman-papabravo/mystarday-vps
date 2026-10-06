'use strict';

const fs = require('fs');
const path = require('path');
const {
  DEFAULT_LOCALE,
  CANONICAL_FALLBACK_LOCALE,
  SUPPORTED_LOCALES,
  normalizeLocale,
  validateLocale,
  intlLocaleTag,
} = require('./locale');

const locales = {};
const localesDir = path.join(__dirname, '..', 'locales');
const i18nFragmentsDir = path.join(__dirname, '..', '..', 'config', 'i18n');

const isDevOrTest = () => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'; // pragma: allowlist secret

function deepMergeObjects(target, source) {
  const out = { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') {
      out[k] = deepMergeObjects(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Map fragment filename domain → client namespace (dot-notation prefix). */
const FRAGMENT_NAMESPACE = Object.freeze({
  'for-dig': 'forDig',
  'print-schema': 'printSchema',
});

/** Canonical fragment domains loaded at runtime. Tests must use this list. */
const FRAGMENT_DOMAINS = Object.freeze([
  'onboarding',
  'home',
  'today',
  'journey',
  'time',
  'nav',
  'planning',
  'library',
  'family',
  'schedule',
  'settings',
  'child',
  'for-dig',
  'print-schema',
  'reports',
  'help',
]);

function mergeLocaleFragments() {
  for (const locale of SUPPORTED_LOCALES) {
    for (const domain of FRAGMENT_DOMAINS) {
      const fragmentPath = path.join(i18nFragmentsDir, `${domain}-${locale}.json`);
      if (!fs.existsSync(fragmentPath)) continue;
      try {
        const fragment = JSON.parse(fs.readFileSync(fragmentPath, 'utf8'));
        const namespace = FRAGMENT_NAMESPACE[domain] || domain;
        if (!locales[locale]) locales[locale] = {};
        locales[locale][namespace] = deepMergeObjects(locales[locale][namespace] || {}, fragment);
      } catch (err) {
        console.error(`[i18n] Failed to parse fragment ${fragmentPath}:`, err.message);
      }
    }
  }
}

/**
 * Load locale JSON files from src/locales/.
 * Files named sv-SE.json, en-GB.json; legacy sv.json aliases to sv-SE.
 */
function loadLocales() {
  for (const key of Object.keys(locales)) delete locales[key];

  if (!fs.existsSync(localesDir)) {
    console.warn('[i18n] Locales directory missing:', localesDir);
    return;
  }

  const files = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const fileKey = file.replace('.json', '');
    try {
      locales[fileKey] = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
    } catch (err) {
      console.error(`[i18n] Failed to parse ${file}:`, err.message);
    }
  }

  // Legacy aliases: sv → sv-SE content, en → en-GB content
  if (locales['sv-SE'] && !locales.sv) locales.sv = locales['sv-SE'];
  if (locales['en-GB'] && !locales.en) locales.en = locales['en-GB'];
  if (locales.sv && !locales['sv-SE']) locales['sv-SE'] = locales.sv;

  mergeLocaleFragments();

  console.log(`[i18n] Loaded locales: ${Object.keys(locales).join(', ')}`);
}

/**
 * Resolve locale key used in loaded bundles.
 * @param {string|null|undefined} lang
 * @param {Record<string, object>} [bundles]
 * @returns {string}
 */
function resolveBundleKey(lang, bundles = locales) {
  const normalized = normalizeLocale(lang);
  if (normalized && bundles[normalized]) return normalized;
  if (normalized === 'sv-SE' && bundles.sv) return 'sv';
  if (normalized === 'en-GB' && bundles.en) return 'en';
  if (normalized) return normalized;
  if (bundles[DEFAULT_LOCALE]) return DEFAULT_LOCALE;
  if (bundles.sv) return 'sv';
  return DEFAULT_LOCALE;
}

/**
 * Walk nested object by dot-notation key.
 * @param {object} root
 * @param {string} key
 * @returns {unknown}
 */
function lookup(root, key) {
  const keys = key.split('.');
  let value = root;
  for (const k of keys) {
    value = value?.[k];
  }
  return value;
}

/**
 * Resolve a message from explicit bundles.
 * Chain: requested locale → canonical fallback (en-GB) → key.
 * Never fills non-Swedish from sv-SE.
 * @param {string} lang
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @param {Record<string, object>} [bundles]
 * @returns {string}
 */
function tWithBundles(lang, key, params = {}, bundles = locales) {
  const bundleKey = resolveBundleKey(lang, bundles);
  const canonicalKey = resolveBundleKey(CANONICAL_FALLBACK_LOCALE, bundles);

  let value = lookup(bundles[bundleKey], key);
  if (typeof value !== 'string' && bundleKey !== canonicalKey) {
    value = lookup(bundles[canonicalKey], key);
    if (typeof value === 'string' && isDevOrTest()) {
      console.warn(`[i18n] Missing key "${key}" for ${bundleKey}, fell back to ${canonicalKey}`);
    }
  }

  if (typeof value !== 'string') {
    if (isDevOrTest()) {
      console.warn(`[i18n] Missing key "${key}" (lang=${bundleKey})`);
    }
    return key;
  }

  return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ''));
}

/**
 * Get translation for a key. Missing keys use en-GB, then the key itself.
 * @param {string} lang
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
function t(lang, key, params = {}) {
  return tWithBundles(lang, key, params, locales);
}

/**
 * CLDR plural category for this locale. Swedish and English stay one/other.
 * Future languages can add zero/two/few/many keys; missing categories use `other`.
 * @param {string} lang
 * @param {number} count
 * @returns {string}
 */
function pluralCategory(lang, count) {
  const n = Number(count);
  const canonical = intlLocaleTag(lang);
  try {
    return new Intl.PluralRules(canonical).select(Number.isFinite(n) ? n : 0);
  } catch {
    return n === 1 ? 'one' : 'other';
  }
}

/**
 * Plural helper. Looks up baseKey.<category>, then baseKey.other.
 * @param {string} lang
 * @param {string} baseKey
 * @param {number} count
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
function plural(lang, baseKey, count, params = {}) {
  const merged = { ...params, count };
  const category = pluralCategory(lang, count);
  const exactKey = `${baseKey}.${category}`;
  const exact = t(lang, exactKey, merged);
  if (exact !== exactKey) return exact;
  if (category !== 'other') {
    const otherKey = `${baseKey}.other`;
    const other = t(lang, otherKey, merged);
    if (other !== otherKey) return other;
  }
  return exact;
}

/**
 * Assemble a locale payload. Non-Swedish locales never merge sv-SE.
 * Future locales fill missing leaves from en-GB only.
 * @param {string} lang
 * @param {Record<string, object>} [bundles]
 * @returns {object}
 */
function assembleLocale(lang, bundles = locales) {
  const canonical = validateLocale(lang, { fallback: DEFAULT_LOCALE });
  const bundleKey = resolveBundleKey(canonical, bundles);
  const primary = bundles[bundleKey] || {};
  if (canonical === DEFAULT_LOCALE) return { ...primary };

  const canonicalKey = resolveBundleKey(CANONICAL_FALLBACK_LOCALE, bundles);
  const fallback = bundles[canonicalKey] || {};
  if (bundleKey === canonicalKey) return { ...primary };

  return deepMergeFallback(fallback, primary);
}

/**
 * Get all translations for a language (for frontend API).
 * @param {string} lang
 * @returns {object}
 */
function getLocale(lang) {
  return assembleLocale(lang, locales);
}

/**
 * Shallow-deep merge: primary wins; fill missing leaves from fallback.
 * @param {object} fallback
 * @param {object} primary
 * @returns {object}
 */
function deepMergeFallback(fallback, primary) {
  const out = { ...fallback };
  for (const [k, v] of Object.entries(primary)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && fallback[k] && typeof fallback[k] === 'object') {
      out[k] = deepMergeFallback(fallback[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * @returns {string[]}
 */
function getAvailableLanguages() {
  return [...SUPPORTED_LOCALES];
}

/**
 * Compare key structure between locale files (for tests).
 * @returns {{ missingInEn: string[], missingInSv: string[] }}
 */
function compareLocaleStructures() {
  const sv = locales['sv-SE'] || locales.sv || {};
  const en = locales['en-GB'] || locales.en || {};
  const svKeys = flattenKeys(sv);
  const enKeys = flattenKeys(en);
  const svSet = new Set(svKeys);
  const enSet = new Set(enKeys);
  return {
    missingInEn: svKeys.filter((k) => !enSet.has(k)),
    missingInSv: enKeys.filter((k) => !svSet.has(k)),
  };
}

/**
 * Grammar suffixes and optional blanks that are empty on purpose.
 * New empty strings outside this set fail the contract.
 */
const ALLOW_EMPTY_TRANSLATIONS = new Set([
  'market.choice.hint',
  'child.checkoff.score.1',
  'today.bump.movedOne',
  'today.rating.labels[0]',
  'today.emotions.sliderSuffixOne',
  'today.emotions.sliderSuffixMany',
]);

/**
 * Same key, different commercial sentence. Language must not own this copy.
 * Kept visible so a new mismatch cannot hide next to it.
 */
const ALLOW_PLACEHOLDER_MISMATCH = new Set([]);

function flattenLeaves(obj, prefix = '') {
  const leaves = [];
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const pathKey = `${prefix}[${index}]`;
      if (item && typeof item === 'object') leaves.push(...flattenLeaves(item, pathKey));
      else leaves.push({ key: pathKey, value: item });
    });
    return leaves;
  }
  for (const [k, v] of Object.entries(obj)) {
    const pathKey = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v) || (v && typeof v === 'object')) {
      leaves.push(...flattenLeaves(v, pathKey));
    } else {
      leaves.push({ key: pathKey, value: v });
    }
  }
  return leaves;
}

function flattenKeys(obj, prefix = '') {
  return flattenLeaves(obj, prefix).map((leaf) => leaf.key);
}

function placeholderNames(value) {
  if (typeof value !== 'string') return [];
  const names = [];
  const re = /\{\{(\w+)\}\}/g;
  let match = re.exec(value);
  while (match) {
    names.push(match[1]);
    match = re.exec(value);
  }
  return names.sort();
}

/**
 * Structural contract between sv-SE and en-GB.
 * CI fails when keys, empties, or interpolation variables diverge.
 * @param {Record<string, object>} [bundles]
 * @returns {{ ok: boolean, errors: string[] }}
 */
function auditTranslationContract(bundles = locales) {
  const sv = bundles['sv-SE'] || bundles.sv || {};
  const en = bundles['en-GB'] || bundles.en || {};
  const svLeaves = flattenLeaves(sv);
  const enLeaves = flattenLeaves(en);
  const svMap = new Map(svLeaves.map((leaf) => [leaf.key, leaf.value]));
  const enMap = new Map(enLeaves.map((leaf) => [leaf.key, leaf.value]));
  const errors = [];

  for (const key of svMap.keys()) {
    if (!enMap.has(key)) errors.push(`missing in en-GB: ${key}`);
  }
  for (const key of enMap.keys()) {
    if (!svMap.has(key)) errors.push(`missing in sv-SE: ${key}`);
  }

  const shared = [...svMap.keys()].filter((key) => enMap.has(key));
  for (const key of shared) {
    for (const [label, value] of [['sv-SE', svMap.get(key)], ['en-GB', enMap.get(key)]]) {
      if (value == null) errors.push(`null in ${label}: ${key}`);
      else if (typeof value !== 'string') errors.push(`non-string in ${label}: ${key}`);
      else if (value.trim() === '' && !ALLOW_EMPTY_TRANSLATIONS.has(key)) {
        errors.push(`empty in ${label}: ${key}`);
      }
    }
    const svPlaceholders = placeholderNames(svMap.get(key));
    const enPlaceholders = placeholderNames(enMap.get(key));
    if (!ALLOW_PLACEHOLDER_MISMATCH.has(key) && svPlaceholders.join('|') !== enPlaceholders.join('|')) {
      errors.push(
        `placeholder mismatch ${key}: sv-SE {{${svPlaceholders.join(',')}}} en-GB {{${enPlaceholders.join(',')}}}`
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

module.exports = {
  loadLocales,
  t,
  tWithBundles,
  plural,
  getLocale,
  assembleLocale,
  getAvailableLanguages,
  resolveBundleKey,
  compareLocaleStructures,
  auditTranslationContract,
  ALLOW_EMPTY_TRANSLATIONS,
  ALLOW_PLACEHOLDER_MISMATCH,
  pluralCategory,
  FRAGMENT_DOMAINS,
  FRAGMENT_NAMESPACE,
};
