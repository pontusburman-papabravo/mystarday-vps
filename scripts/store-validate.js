'use strict';

/**
 * Validate store locale mappings and the shipped sv / en-GB listings.
 * Usage: node scripts/store-validate.js
 */

const fs = require('fs');
const path = require('path');
const {
  loadStoreCatalog,
  resolveStoreUrl,
  resolveStoreLocales,
  effectiveListing,
  assessMarket,
  formatAssessment,
} = require('../src/lib/store-locale');
const { checkAndroidResources, syncIos } = require('./sync-native-locales');

const SWEDISH_IN_ENGLISH = /\b(och|för|inte|stjärn\w*|förälder\w*|vardagen|scheman|barnet)\b/i;
const ALLOWED_TOKENS = new Set(['brand']);
const URL_RE = /^https:\/\/[^\s]+$/;

function textOf(value) {
  if (typeof value === 'string') return value;
  return '';
}

function expandedLength(value, limits) {
  const sample = textOf(value).replace(/\{\{brand\}\}/g, 'B'.repeat(limits.brandTokenMax));
  return [...sample].length;
}

function tokensIn(value) {
  return [...textOf(value).matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map((match) => match[1]);
}

function validateListing(storeName, locale, listing, limits, errors, label) {
  const spec = limits[storeName];
  for (const field of spec.required) {
    const value = listing[field];
    if (value && typeof value === 'object' && value.status === 'live_external') continue;
    if (value == null || value === '') {
      errors.push(`${label} ${locale} missing ${field}`);
      continue;
    }
    if (spec.urlFields && spec.urlFields.includes(field) && !URL_RE.test(resolveStoreUrl(value))) {
      errors.push(`${label} ${locale} ${field} is not an https URL`);
    }
    const max = spec.max && spec.max[field];
    if (max && expandedLength(value, limits) > max) {
      errors.push(`${label} ${locale} ${field} exceeds ${max}`);
    }
    for (const token of tokensIn(value)) {
      if (!ALLOWED_TOKENS.has(token)) errors.push(`${label} ${locale} ${field} has unknown token {{${token}}}`);
    }
  }
  if (spec.englishLocales && spec.englishLocales.includes(locale)) {
    const blob = spec.required.map((field) => textOf(listing[field])).join('\n');
    if (SWEDISH_IN_ENGLISH.test(blob) || /[åäö]/i.test(blob)) {
      errors.push(`${label} ${locale} contains Swedish text`);
    }
  }
}

function validateIap(catalog, errors) {
  const limits = catalog.limits.iap;
  for (const product of catalog.iap.products) {
    for (const storeName of ['apple', 'google']) {
      const side = product[storeName] || {};
      for (const [locale, copy] of Object.entries(side)) {
        if (!copy.name || !copy.description) {
          errors.push(`IAP ${product.id} ${storeName} ${locale} missing name or description`);
          continue;
        }
        if (expandedLength(copy.name, catalog.limits) > limits[storeName].name) {
          errors.push(`IAP ${product.id} ${storeName} ${locale} name too long`);
        }
        if (expandedLength(copy.description, catalog.limits) > limits[storeName].description) {
          errors.push(`IAP ${product.id} ${storeName} ${locale} description too long`);
        }
        if (limits.englishLocales.includes(locale) && (/[åäö]/i.test(copy.name + copy.description) || SWEDISH_IN_ENGLISH.test(copy.name + copy.description))) {
          errors.push(`IAP ${product.id} ${storeName} ${locale} contains Swedish text`);
        }
      }
    }
  }
}

function validateMappings(catalog, errors) {
  const { appLocales, appleLocales, googleLocales } = catalog.locales;
  const publicIds = new Set(
    JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config/locale-catalog.json'), 'utf8'))
      .locales.filter((locale) => locale.availability === 'public').map((locale) => locale.id)
  );
  for (const [id, row] of Object.entries(appLocales)) {
    if (!row.apple || (!row.apple.locale && !row.apple.fallback)) {
      errors.push(`${id} missing Apple locale or fallback`);
    }
    if (!row.google || (!row.google.locale && !row.google.fallback)) {
      errors.push(`${id} missing Google Play locale or fallback`);
    }
    const resolved = resolveStoreLocales(id, catalog);
    if (resolved.apple && resolved.apple.locale && !appleLocales.includes(resolved.apple.locale)) {
      errors.push(`${id} Apple locale ${resolved.apple.locale} is not supported`);
    }
    if (resolved.google && resolved.google.locale && !googleLocales.includes(resolved.google.locale)) {
      errors.push(`${id} Google Play locale ${resolved.google.locale} is not supported`);
    }
    if (resolved.apple && !resolved.apple.direct && !resolved.apple.fallback) {
      errors.push(`${id} Apple fallback missing`);
    }
    if (resolved.google && !resolved.google.direct && !resolved.google.fallback) {
      errors.push(`${id} Google Play fallback missing`);
    }
    if (row.status === 'shipped' && !publicIds.has(id)) {
      errors.push(`${id} is marked shipped but is not a public app locale`);
    }
    if (publicIds.has(id) && row.status !== 'shipped') {
      errors.push(`Public app locale ${id} is not marked shipped in the store catalog`);
    }
  }
  for (const id of publicIds) {
    if (!appLocales[id]) errors.push(`Public app locale ${id} has no store mapping`);
  }
}

function validateShippedListings(catalog, errors) {
  for (const market of catalog.markets.markets) {
    if (market.activation !== 'live') continue;
    for (const storeName of ['apple', 'google']) {
      const resolved = resolveStoreLocales(market.defaultAppLocale, catalog);
      const side = storeName === 'apple' ? resolved.apple : resolved.google;
      const listing = effectiveListing(storeName, side.locale, market, catalog);
      if (!listing) {
        errors.push(`Live market ${market.id} has no ${storeName} listing for ${side.locale}`);
        continue;
      }
      validateListing(storeName, side.locale, listing, catalog.limits, errors, `${market.id} ${storeName}`);
    }
  }
}

function main() {
  const catalog = loadStoreCatalog();
  const errors = [];
  validateMappings(catalog, errors);
  validateShippedListings(catalog, errors);
  validateIap(catalog, errors);
  try {
    syncIos(true);
    checkAndroidResources();
  } catch (err) {
    errors.push(err.message);
  }

  const focus = ['SE', 'IE', 'CA', 'DE', 'BE', 'FI', 'IS'];
  for (const id of focus) {
    console.log(formatAssessment(assessMarket(id, undefined, catalog)));
    console.log('');
  }
  const beFrench = assessMarket('BE', 'fr-FR', catalog);
  const beDutch = assessMarket('BE', 'nl-NL', catalog);
  console.log(`BE fr-FR apple=${beFrench.appleLocale} google=${beFrench.googleLocale}`);
  console.log(`BE nl-NL apple=${beDutch.appleLocale} google=${beDutch.googleLocale}`);

  if (errors.length) {
    console.error(`store:validate failed (${errors.length})`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('store:validate ok');
}

if (require.main === module) main();

module.exports = { main, SWEDISH_IN_ENGLISH };
