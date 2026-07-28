'use strict';

const fs = require('fs');
const path = require('path');
const {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  normalizeLocale,
  validateLocale,
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

function mergeLocaleFragments() {
  /** Map fragment filename domain → client namespace (dot-notation prefix). */
  const FRAGMENT_NAMESPACE = {
    'for-dig': 'forDig',
    'print-schema': 'printSchema',
  };
  const fragmentDomains = ['onboarding', 'home', 'today', 'journey', 'time', 'nav', 'planning', 'library', 'family', 'schedule', 'settings', 'child', 'for-dig', 'print-schema'];
  for (const locale of SUPPORTED_LOCALES) {
    for (const domain of fragmentDomains) {
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
 * @returns {string}
 */
function resolveBundleKey(lang) {
  const normalized = normalizeLocale(lang);
  if (normalized && locales[normalized]) return normalized;
  if (normalized === 'sv-SE' && locales.sv) return 'sv';
  if (normalized === 'en-GB' && locales.en) return 'en';
  if (locales[DEFAULT_LOCALE]) return DEFAULT_LOCALE;
  if (locales.sv) return 'sv';
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
 * Get translation for a key. Falls back to sv-SE when key missing; warns in dev/test.
 * @param {string} lang
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
function t(lang, key, params = {}) {
  const bundleKey = resolveBundleKey(lang);
  const fallbackKey = resolveBundleKey(DEFAULT_LOCALE);

  let value = lookup(locales[bundleKey], key);
  if (typeof value !== 'string') {
    value = lookup(locales[fallbackKey], key);
    if (typeof value === 'string' && bundleKey !== fallbackKey && isDevOrTest()) {
      console.warn(`[i18n] Missing key "${key}" for ${bundleKey}, fell back to ${fallbackKey}`);
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
 * Plural helper — keys at baseKey.one / baseKey.other
 * @param {string} lang
 * @param {string} baseKey
 * @param {number} count
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
function plural(lang, baseKey, count, params = {}) {
  const suffix = Number(count) === 1 ? 'one' : 'other';
  return t(lang, `${baseKey}.${suffix}`, { ...params, count });
}

/**
 * Get all translations for a language (for frontend API).
 * @param {string} lang
 * @returns {object}
 */
function getLocale(lang) {
  const canonical = validateLocale(lang, { fallback: DEFAULT_LOCALE });
  const bundleKey = resolveBundleKey(canonical);
  const fallbackKey = resolveBundleKey(DEFAULT_LOCALE);
  const primary = locales[bundleKey] || {};
  const fallback = locales[fallbackKey] || {};

  if (bundleKey === fallbackKey) return { ...primary };

  return deepMergeFallback(fallback, primary);
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

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const pathKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, pathKey));
    } else {
      keys.push(pathKey);
    }
  }
  return keys;
}

module.exports = {
  loadLocales,
  t,
  plural,
  getLocale,
  getAvailableLanguages,
  resolveBundleKey,
  compareLocaleStructures,
};
