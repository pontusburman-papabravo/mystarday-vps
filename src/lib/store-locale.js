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
  const localeId = appLocale || market.defaultAppLocale;
  const resolved = resolveStoreLocales(localeId, catalog);
  const { isPublicLocale } = require('./locale');
  const appReady = resolved.mapped && isPublicLocale(localeId);
  if (!resolved.mapped) reasons.push(`App locale ${localeId} has no store mapping`);
  else if (!appReady) reasons.push(`App locale ${localeId} is not a public app locale`);

  const apple = assessStore('apple', resolved.apple, market, catalog, reasons, 'Apple');
  const google = assessStore('google', resolved.google, market, catalog, reasons, 'Google Play');

  if (market.activation !== 'live') {
    reasons.push(`Market ${marketId} is not activated`);
  }

  const marketReady = market.activation === 'live' && appReady && apple.ready && google.ready;
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

function assessStore(storeName, side, market, catalog, reasons, label) {
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
    for (const file of shots.files) {
      if (!fs.existsSync(path.join(STORE_DIR, file))) {
        reasons.push(`${label} screenshot file missing: ${file}`);
        return { ready: false };
      }
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
