'use strict';

/**
 * APP_READY is a resource contract, not a catalog row.
 * Runtime fallbacks (en-GB bundle, English default content) stay as safety
 * and never count as a finished language.
 */

const fs = require('fs');
const path = require('path');
const {
  FRAGMENT_DOMAINS,
  FRAGMENT_NAMESPACE,
  flattenLeaves,
  placeholderNames,
  ALLOW_EMPTY_TRANSLATIONS,
} = require('./i18n');
const {
  contentMapFile,
  experiencePackIdForLocale,
  intlLocaleTag,
  usesCanonicalLibrary,
  usesLocaleFileContent,
  getPublicLocaleCatalog,
  normalizeLocale,
} = require('./locale');

const ROOT = path.join(__dirname, '..', '..');
const CONTRACT = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/locale-readiness.json'), 'utf8'));
const LOCALES_DIR = path.join(ROOT, 'src/locales');
const FRAGMENTS_DIR = path.join(ROOT, 'config/i18n');
const CONTENT_MAP_DIR = path.join(ROOT, 'config/family-content-locale');
const DEFAULT_CONTENT_DIR = path.join(ROOT, 'config/default-content');
const PACKS_DIR = path.join(ROOT, 'config/experience-packs');
const MIN_SHOT = Object.freeze({ width: 320, height: 320 });
const MIN_FEATURE = Object.freeze({ width: 1024, height: 500 });

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function availabilityOf(locale) {
  const row = getPublicLocaleCatalog().find((entry) => entry.id === locale);
  return row ? row.availability : null;
}

function deepMerge(target, source) {
  const out = { ...(target || {}) };
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object') {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function mergeFragments(locale, bundle, errors) {
  let merged = bundle;
  for (const domain of FRAGMENT_DOMAINS) {
    const file = path.join(FRAGMENTS_DIR, `${domain}-${locale}.json`);
    if (!fs.existsSync(file)) {
      errors.push(`missing fragment ${domain}`);
      continue;
    }
    const fragment = readJson(file);
    const namespace = FRAGMENT_NAMESPACE[domain] || domain;
    merged = {
      ...merged,
      [namespace]: deepMerge(merged[namespace], fragment),
    };
  }
  return merged;
}

function loadBundle(locale, errors) {
  const file = path.join(LOCALES_DIR, `${locale}.json`);
  if (!fs.existsSync(file)) {
    errors.push(`missing translation bundle ${locale}.json`);
    return {};
  }
  return mergeFragments(locale, readJson(file), errors);
}

function placeholderKey(value) {
  return placeholderNames(value).filter((name) => name !== 'brand').join('|');
}

function spacingMatches(reference, value) {
  const re = /\{\{(?!brand\b)\w+\}\}/g;
  const refPh = [...String(reference).matchAll(re)];
  const ownPh = [...String(value).matchAll(re)];
  if (refPh.length !== ownPh.length) return true;
  if (!refPh.length) return true;
  for (let i = 0; i < refPh.length; i++) {
    const ref = refPh[i];
    const own = ownPh[i];
    const refBefore = reference[ref.index - 1];
    const ownBefore = value[own.index - 1];
    if (refBefore === ' ' && ownBefore && ownBefore !== ' ') return false;
    const refAfter = reference[ref.index + ref[0].length];
    const ownAfter = value[own.index + own[0].length];
    if (refAfter === ' ' && ownAfter && ownAfter !== ' ') return false;
  }
  return true;
}

const EXTRA_PLURAL_CATEGORIES = new Set(['zero', 'two', 'few', 'many']);

function extraPluralParent(key) {
  const dot = key.lastIndexOf('.');
  if (dot <= 0) return null;
  const category = key.slice(dot + 1);
  if (!EXTRA_PLURAL_CATEGORIES.has(category)) return null;
  return key.slice(0, dot);
}

function compareLeaves(locale, ownBundle, referenceBundle, errors) {
  const own = new Map(flattenLeaves(ownBundle).map((leaf) => [leaf.key, leaf.value]));
  const reference = new Map(flattenLeaves(referenceBundle).map((leaf) => [leaf.key, leaf.value]));
  for (const key of reference.keys()) {
    if (!own.has(key)) errors.push(`missing key ${key}`);
  }
  for (const key of own.keys()) {
    if (reference.has(key)) continue;
    const parent = extraPluralParent(key);
    if (parent && reference.has(`${parent}.other`)) continue;
    errors.push(`extra key ${key}`);
  }
  const signal = CONTRACT.signals[locale];
  const minLength = CONTRACT.identicalStringMinLength;
  for (const key of reference.keys()) {
    if (!own.has(key)) continue;
    const refValue = reference.get(key);
    const ownValue = own.get(key);
    if (typeof refValue !== 'string' || typeof ownValue !== 'string') continue;
    if (ownValue.trim() === '' && !ALLOW_EMPTY_TRANSLATIONS.has(key)) {
      errors.push(`empty ${key}`);
    }
    if (placeholderKey(refValue) !== placeholderKey(ownValue)) {
      errors.push(`placeholder mismatch ${key}`);
    } else if (signal && signal.mustNotCopy && !spacingMatches(refValue, ownValue)) {
      errors.push(`placeholder spacing ${key}`);
    }
    if (signal && signal.mustNotCopy && ownValue === refValue && ownValue.length > minLength) {
      errors.push(`english copy ${key}`);
    }
  }
  for (const key of own.keys()) {
    if (reference.has(key)) continue;
    const parent = extraPluralParent(key);
    if (!parent || !reference.has(`${parent}.other`)) continue;
    const ownValue = own.get(key);
    const otherValue = reference.get(`${parent}.other`);
    if (typeof ownValue !== 'string' || typeof otherValue !== 'string') continue;
    if (ownValue.trim() === '') errors.push(`empty ${key}`);
    if (placeholderKey(otherValue) !== placeholderKey(ownValue)) {
      errors.push(`placeholder mismatch ${key}`);
    }
  }
  if (signal && signal.positive) {
    const blob = [...own.values()].filter((value) => typeof value === 'string').join('\n');
    if (!new RegExp(signal.positive, 'i').test(blob)) {
      errors.push('missing positive language signal');
    }
    if (signal.forbidden && new RegExp(signal.forbidden, 'i').test(blob)) {
      errors.push('source-language text in product copy');
    }
  }
  missingPluralCategories(locale, own, reference, errors);
}

function missingPluralCategories(locale, own, reference, errors) {
  let rules;
  try {
    rules = new Intl.PluralRules(intlLocaleTag(locale));
  } catch (_) {
    return;
  }
  const operationalCounts = [0, 1, 2, 3, 4, 5, 11, 12, 22, 25];
  const extras = [...new Set(operationalCounts.map((count) => rules.select(count)))]
    .filter((category) => EXTRA_PLURAL_CATEGORIES.has(category));
  if (!extras.length) return;
  const parents = new Set();
  for (const key of reference.keys()) {
    if (!key.endsWith('.one')) continue;
    const parent = key.slice(0, -4);
    if (reference.has(`${parent}.other`)) parents.add(parent);
  }
  for (const parent of parents) {
    for (const category of extras) {
      const key = `${parent}.${category}`;
      if (!own.has(key)) errors.push(`missing plural ${key}`);
    }
  }
}

function sectionErrors(bundle, errors) {
  for (const section of CONTRACT.productSections) {
    const value = bundle[section];
    if (!value || typeof value !== 'object') errors.push(`missing product section ${section}`);
  }
}

function intlErrors(locale, errors) {
  const tag = intlLocaleTag(locale);
  let date = '';
  let number = '';
  let plural = '';
  try {
    date = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date('2026-10-06T12:00:00Z'));
    number = new Intl.NumberFormat(tag).format(1234.5);
    plural = new Intl.PluralRules(tag).select(2);
  } catch (err) {
    errors.push(`intl formatters failed: ${err.message}`);
    return;
  }
  if (!date || !number || !plural) errors.push('intl formatters returned empty');
  if (locale !== CONTRACT.referenceLocale) {
    const englishNumber = new Intl.NumberFormat(CONTRACT.referenceLocale).format(1234.5);
    const englishDate = new Intl.DateTimeFormat(CONTRACT.referenceLocale, {
      day: 'numeric', month: 'long', timeZone: 'UTC',
    }).format(new Date('2026-10-06T12:00:00Z'));
    if (number === englishNumber) {
      const resolved = new Intl.NumberFormat(tag).resolvedOptions().locale;
      const englishResolved = new Intl.NumberFormat(CONTRACT.referenceLocale).resolvedOptions().locale;
      // Same digits are a missing-locale failure only when Intl fell back to English.
      // Irish and Maltese use the same decimal pattern as en-GB on purpose.
      if (resolved === englishResolved) errors.push('number format matches the reference locale');
    }
    if (date === englishDate) errors.push('date format matches the reference locale');
  }
}

function defaultContentErrors(locale, errors) {
  const dir = path.join(DEFAULT_CONTENT_DIR, locale);
  for (const file of ['activities.json', 'categories.json', 'rewards.json']) {
    if (!fs.existsSync(path.join(dir, file))) errors.push(`missing default content ${file}`);
  }
}

function contentMapErrors(locale, errors) {
  if (!usesLocaleFileContent(locale)) return;
  const fileName = contentMapFile(locale);
  if (!fileName) {
    errors.push('missing contentMap in the locale catalog');
    return;
  }
  const file = path.join(CONTENT_MAP_DIR, fileName);
  if (!fs.existsSync(file)) {
    errors.push(`missing family content map ${fileName}`);
    return;
  }
  if (locale === CONTRACT.referenceLocale) return;
  const referenceName = contentMapFile(CONTRACT.referenceLocale);
  if (!referenceName) return;
  const own = readJson(file);
  const reference = readJson(path.join(CONTENT_MAP_DIR, referenceName));
  for (const section of Object.keys(reference)) {
    if (section === 'version') continue;
    const refKeys = reference[section] && typeof reference[section] === 'object' ? Object.keys(reference[section]) : null;
    const ownSection = own[section];
    if (!refKeys) continue;
    if (!ownSection || typeof ownSection !== 'object') {
      errors.push(`content map missing ${section}`);
      continue;
    }
    for (const key of refKeys) {
      if (ownSection[key] == null || ownSection[key] === '') errors.push(`content map missing ${section}.${key}`);
    }
  }
}

function journeyErrors(locale, errors) {
  if (usesCanonicalLibrary(locale)) return;
  const file = path.join(ROOT, 'config', `journey-${locale}-translations.js`);
  if (!fs.existsSync(file)) errors.push('missing journey translations');
}

function experiencePackErrors(locale, errors) {
  const packId = experiencePackIdForLocale(locale);
  const manifestPath = path.join(PACKS_DIR, packId, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    errors.push(`missing experience pack ${packId}`);
    return;
  }
  const manifest = readJson(manifestPath);
  if (manifest.locale !== locale) errors.push(`experience pack locale is ${manifest.locale}`);
  if (manifest.pack_id !== packId) errors.push(`experience pack id is ${manifest.pack_id}`);
  if (!fs.existsSync(path.join(PACKS_DIR, packId, 'copy.json'))) errors.push('missing experience pack copy');
}

function nativeErrors(locale, errors) {
  const store = readJson(path.join(ROOT, 'store/locales.json'));
  const row = store.appLocales[locale];
  const ios = row && row.native && row.native.ios;
  const resources = (row && row.native && row.native.androidResources) || [];
  if (!ios) errors.push('missing native iOS language');
  else {
    const plist = fs.readFileSync(path.join(ROOT, 'ios/App/App/Info.plist'), 'utf8');
    if (!plist.includes(`<string>${ios}</string>`)) errors.push(`iOS language ${ios} is not declared`);
    const lproj = path.join(ROOT, 'ios/App/App', `${ios}.lproj`);
    for (const file of ['InfoPlist.strings', 'Localizable.strings']) {
      if (!fs.existsSync(path.join(lproj, file))) errors.push(`missing ${ios}.lproj/${file}`);
    }
  }
  if (!resources.length) errors.push('missing native Android resources');
  for (const rel of resources) {
    if (!fs.existsSync(path.join(ROOT, rel))) errors.push(`missing ${rel}`);
  }
  if (locale !== CONTRACT.referenceLocale && resources.length) {
    const ownXml = fs.readFileSync(path.join(ROOT, resources[0]), 'utf8');
    const channel = ownXml.match(/<string name="notification_channel_routine_name">([^<]*)<\/string>/);
    const english = fs.readFileSync(path.join(ROOT, 'scripts/android/l10n/res/values-en-rGB/strings.xml'), 'utf8');
    const englishChannel = english.match(/<string name="notification_channel_routine_name">([^<]*)<\/string>/);
    if (!channel) errors.push('missing notification channel name');
    else if (englishChannel && channel[1] === englishChannel[1]) errors.push('notification channel text copies English');
  }
}

/**
 * @param {string} localeId
 * @returns {{ locale: string, ready: boolean, errors: string[] }}
 */
function assessAppLocale(localeId) {
  const locale = normalizeLocale(localeId);
  if (!locale) return { locale: localeId, ready: false, errors: [`unknown locale ${localeId}`] };
  const errors = [];
  const availability = availabilityOf(locale);
  if (availability !== 'public' && availability !== 'enabled') {
    errors.push(`locale ${locale} is not public or enabled`);
  }
  if (CONTRACT.signals[locale] == null && locale !== CONTRACT.referenceLocale && locale !== CONTRACT.canonicalLocale) {
    errors.push('missing readiness signal');
  }
  const reference = loadBundle(CONTRACT.referenceLocale, []);
  const bundle = loadBundle(locale, errors);
  compareLeaves(locale, bundle, reference, errors);
  sectionErrors(bundle, errors);
  intlErrors(locale, errors);
  defaultContentErrors(locale, errors);
  contentMapErrors(locale, errors);
  journeyErrors(locale, errors);
  experiencePackErrors(locale, errors);
  nativeErrors(locale, errors);
  return { locale, ready: errors.length === 0, errors };
}

function pngSize(file) {
  const buf = fs.readFileSync(file);
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

module.exports = {
  assessAppLocale,
  pngSize,
  MIN_SHOT,
  MIN_FEATURE,
  CONTRACT,
};
