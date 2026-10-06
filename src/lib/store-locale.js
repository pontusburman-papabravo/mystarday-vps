'use strict';

/**
 * Store locale catalog. App locale, market, Apple metadata locale, and
 * Google Play listing locale are separate fields in store/locales.json.
 * Scripts must not grow their own switch statements for these codes.
 */

const fs = require('fs');
const path = require('path');
const { MAIN_DOMAIN, APP_DOMAIN } = require('./domain-redirect');

const STORE_URL_HOSTS = Object.freeze({
  app: APP_DOMAIN,
  main: MAIN_DOMAIN,
});

const ROOT = path.join(__dirname, '..', '..');
const STORE_DIR = path.join(ROOT, 'store');

function resolveStoreUrl(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const host = STORE_URL_HOSTS[value.host];
  if (!host || typeof value.path !== 'string' || !value.path.startsWith('/')) return '';
  return `https://${host}${value.path === '/' ? '/' : value.path}`;
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(STORE_DIR, rel), 'utf8'));
}

function loadStoreCatalog() {
  return {
    locales: readJson('locales.json'),
    markets: readJson('markets.json'),
    screenshots: readJson('screenshots.json'),
    iap: readJson('iap.json'),
    limits: readJson('limits.json'),
  };
}

function appLocaleRow(catalog, appLocale) {
  return catalog.locales.appLocales[appLocale] || null;
}

/**
 * @param {string} appLocale
 * @param {ReturnType<typeof loadStoreCatalog>} [catalog]
 */
function resolveStoreLocales(appLocale, catalog = loadStoreCatalog()) {
  const row = appLocaleRow(catalog, appLocale);
  if (!row) {
    return {
      appLocale,
      mapped: false,
      apple: null,
      google: null,
    };
  }
  return {
    appLocale,
    mapped: true,
    status: row.status,
    apple: storeSide(row.apple, catalog.locales.appleLocales),
    google: storeSide(row.google, catalog.locales.googleLocales),
  };
}

function storeSide(side, supported) {
  const direct = side && side.locale ? side.locale : null;
  const fallback = side && side.fallback ? side.fallback : null;
  const effective = direct || fallback;
  return {
    locale: effective,
    direct,
    fallback: direct ? null : fallback,
    acceptFallbackForReady: side ? side.acceptFallbackForReady === true : false,
    supported: Boolean(effective && supported.includes(effective)),
  };
}

function findMarket(catalog, marketId) {
  return (catalog.markets.markets || []).find((market) => market.id === marketId) || null;
}

function listingPath(storeName, storeLocale) {
  return path.join(STORE_DIR, storeName, storeLocale, 'listing.json');
}

function readListing(storeName, storeLocale) {
  const file = listingPath(storeName, storeLocale);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readOverride(storeName, overrideId) {
  if (!overrideId) return null;
  const file = path.join(STORE_DIR, 'overrides', storeName, `${overrideId}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function mergeListing(base, override) {
  if (!base) return null;
  const merged = { ...base };
  if (!override) return merged;
  for (const [key, value] of Object.entries(override)) {
    if (key === 'descriptionAppend' && typeof value === 'string') {
      merged.description = `${merged.description || ''}${value}`;
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

function effectiveListing(storeName, storeLocale, market, catalog = loadStoreCatalog()) {
  void catalog;
  const base = readListing(storeName, storeLocale);
  const override = readOverride(storeName, market && market.listingOverride);
  return mergeListing(base, override);
}

function screenshotStatus(catalog, storeName, storeLocale) {
  const sets = catalog.screenshots.sets[storeName] || {};
  return sets[storeLocale] || null;
}

function iapFor(catalog, storeName, storeLocale) {
  const missing = [];
  for (const product of catalog.iap.products || []) {
    const side = product[storeName] || {};
    if (!side[storeLocale] || !side[storeLocale].name || !side[storeLocale].description) {
      missing.push(product.id);
    }
  }
  return missing;
}

/**
 * @param {string} marketId
 * @param {string} [appLocale]
 * @param {ReturnType<typeof loadStoreCatalog>} [catalog]
 */
function requiredAppLocales(market) {
  if (Array.isArray(market.requiredAppLocales) && market.requiredAppLocales.length) {
    return market.requiredAppLocales;
  }
  return [market.defaultAppLocale];
}

function assessMarket(marketId, appLocale, catalog = loadStoreCatalog()) {
  const market = findMarket(catalog, marketId);
  const reasons = [];
  if (!market) {
    return {
      market: marketId,
      APP_READY: false,
      APPLE_READY: false,
      GOOGLE_READY: false,
      MARKET_READY: false,
      reasons: [`Unknown market ${marketId}`],
    };
  }
  const { assessAppLocale } = require('./locale-readiness');
  const localeId = appLocale || market.defaultAppLocale;
  const resolved = resolveStoreLocales(localeId, catalog);
  const appAssessment = assessAppLocale(localeId);
  const appReady = appAssessment.ready;
  if (!resolved.mapped) reasons.push(`App locale ${localeId} has no store mapping`);
  for (const error of appAssessment.errors) reasons.push(error);

  const apple = assessStore('apple', resolved.apple, market, catalog, reasons, 'Apple', localeId);
  const google = assessStore('google', resolved.google, market, catalog, reasons, 'Google Play', localeId);

  let requiredReady = true;
  for (const required of requiredAppLocales(market)) {
    if (required === localeId) {
      if (!appReady || !apple.ready || !google.ready) requiredReady = false;
      continue;
    }
    const otherApp = assessAppLocale(required);
    const otherResolved = resolveStoreLocales(required, catalog);
    const otherReasons = [];
    const otherApple = assessStore('apple', otherResolved.apple, market, catalog, otherReasons, 'Apple', required);
    const otherGoogle = assessStore('google', otherResolved.google, market, catalog, otherReasons, 'Google Play', required);
    if (!otherApp.ready || !otherApple.ready || !otherGoogle.ready) {
      requiredReady = false;
      reasons.push(`Required app locale ${required} is not ready`);
    }
  }

  if (market.activation !== 'live') {
    reasons.push(`Market ${marketId} is not activated`);
  }

  const marketReady = market.activation === 'live' && requiredReady;
  return {
    market: marketId,
    appLocale: localeId,
    appleLocale: resolved.apple && resolved.apple.locale,
    appleFallback: resolved.apple && resolved.apple.fallback,
    googleLocale: resolved.google && resolved.google.locale,
    googleFallback: resolved.google && resolved.google.fallback,
    APP_READY: appReady,
    APPLE_READY: apple.ready,
    GOOGLE_READY: google.ready,
    MARKET_READY: marketReady,
    reasons,
  };
}

function expandedLength(value, limits) {
  const text = typeof value === 'string' ? value : '';
  return [...text.replace(/\{\{brand\}\}/g, 'B'.repeat(limits.brandTokenMax))].length;
}

function listingFieldErrors(storeName, listing, catalog) {
  const spec = catalog.limits[storeName];
  const errors = [];
  for (const field of spec.required) {
    if (field === 'releaseNotes') continue;
    const value = listing[field];
    if (value == null || value === '') {
      errors.push(`missing ${field}`);
      continue;
    }
    if (spec.urlFields && spec.urlFields.includes(field)) {
      const url = resolveStoreUrl(value);
      if (!/^https:\/\/[^\s]+$/.test(url)) errors.push(`${field} is not an https URL`);
    }
    const max = spec.max && spec.max[field];
    if (max && expandedLength(value, catalog.limits) > max) errors.push(`${field} exceeds ${max}`);
  }
  return errors;
}

function releaseNotesReady(listing, market) {
  const notes = listing.releaseNotes;
  if (notes && typeof notes === 'object' && notes.status === 'live_external') {
    return market.activation === 'live';
  }
  return typeof notes === 'string' && notes.trim().length > 0;
}

function screenshotFileReady(file, minimum) {
  const { pngSize } = require('./locale-readiness');
  const absolute = path.join(STORE_DIR, file);
  if (!fs.existsSync(absolute)) return `${file} missing`;
  const size = pngSize(absolute);
  if (!size) return `${file} is not a PNG`;
  if (size.width < minimum.width || size.height < minimum.height) {
    return `${file} is ${size.width}x${size.height}`;
  }
  return null;
}

function assessStore(storeName, side, market, catalog, reasons, label, appLocale) {
  if (!side || !side.locale) {
    reasons.push(`${label} locale missing`);
    return { ready: false };
  }
  if (!side.supported) {
    reasons.push(`${label} locale ${side.locale} is not in the store locale list`);
    return { ready: false };
  }
  if (!side.direct && !side.acceptFallbackForReady) {
    reasons.push(`${label} metadata for this app locale needs an explicit fallback acceptance`);
    return { ready: false };
  }
  const listing = effectiveListing(storeName, side.locale, market, catalog);
  if (!listing) {
    reasons.push(`${label} listing ${side.locale} missing`);
    return { ready: false };
  }
  const shots = screenshotStatus(catalog, storeName, side.locale);
  const marketShots = market.screenshots && market.screenshots[storeName];
  const liveExternal = market.activation === 'live'
    && (marketShots === 'live_external' || (shots && shots.status === 'live_external'));
  if (liveExternal) {
    // Screenshots already in the live store console.
  } else if (shots && shots.inheritFrom && catalog.screenshots.acceptPrimaryInheritance !== true) {
    reasons.push(`${label} screenshot set ${side.locale} missing (inheritance from ${shots.inheritFrom} is not accepted)`);
    return { ready: false };
  } else if (!shots || shots.status !== 'present' || !Array.isArray(shots.files) || shots.files.length === 0) {
    reasons.push(`${label} screenshot set ${side.locale} missing`);
    return { ready: false };
  } else {
    const { MIN_SHOT, MIN_FEATURE } = require('./locale-readiness');
    for (const file of shots.files) {
      const problem = screenshotFileReady(file, MIN_SHOT);
      if (problem) {
        reasons.push(`${label} screenshot ${problem}`);
        return { ready: false };
      }
    }
    if (storeName === 'google') {
      if (!shots.featureGraphic) {
        reasons.push(`${label} feature graphic missing`);
        return { ready: false };
      }
      const problem = screenshotFileReady(shots.featureGraphic, MIN_FEATURE);
      if (problem) {
        reasons.push(`${label} feature graphic ${problem}`);
        return { ready: false };
      }
    }
  }
  if (!releaseNotesReady(listing, market)) {
    reasons.push(`${label} release notes missing`);
    return { ready: false };
  }
  for (const error of listingFieldErrors(storeName, listing, catalog)) {
    reasons.push(`${label} ${side.locale} ${error}`);
    return { ready: false };
  }
  if (!side.fallback && side.locale !== 'en-GB' && side.locale !== 'en-US' && appLocale && appLocale !== 'sv-SE') {
    const reference = readListing(storeName, 'en-GB');
    const field = storeName === 'apple' ? 'description' : 'fullDescription';
    if (reference && listing[field] && listing[field] === reference[field]) {
      reasons.push(`${label} description copies en-GB`);
      return { ready: false };
    }
  }
  const missingIap = iapFor(catalog, storeName, side.locale);
  if (missingIap.length) {
    reasons.push(`${label} subscription localization ${side.locale} missing (${missingIap.join(', ')})`);
    return { ready: false };
  }
  return { ready: true };
}

function formatAssessment(result) {
  const lines = [
    result.market,
    `APP_READY = ${result.APP_READY}`,
    `APPLE_READY = ${result.APPLE_READY}`,
    `GOOGLE_READY = ${result.GOOGLE_READY}`,
    `MARKET_READY = ${result.MARKET_READY}`,
  ];
  if (result.reasons && result.reasons.length) {
    lines.push('Reasons:');
    for (const reason of result.reasons) lines.push(`- ${reason}`);
  }
  return lines.join('\n');
}

module.exports = {
  STORE_DIR,
  loadStoreCatalog,
  resolveStoreUrl,
  resolveStoreLocales,
  assessMarket,
  effectiveListing,
  formatAssessment,
  readListing,
};
