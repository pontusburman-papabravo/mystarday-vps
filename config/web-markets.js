'use strict';

/**
 * Public-web market registry.
 * Commercial entitlement, store URLs and registration gates stay in their
 * existing modules. This file only points at them.
 * marketingActive is ads/launch copy. It does not decide whether an SEO page exists.
 */

const {
  APPLE_APP_STORE_IE_URL,
  APPLE_APP_STORE_CA_URL,
  APPLE_APP_STORE_GEO_NEUTRAL_URL,
  getIrelandPlayStoreUrl,
  getPlayStoreUrl,
} = require('./store-links');
const { getMarketCommercialPolicy, ENTITLEMENT } = require('../src/lib/market-commercial-policy');
const { gateKeyForCountry, GATE_DEFAULTS } = require('../src/lib/market-region');
const { localeByCode, normalizeWebPath } = require('./web-locales');

const MARKETS = Object.freeze({
  IE: Object.freeze({
    code: 'IE',
    enabled: true,
    locales: Object.freeze(['en']),
    defaultLocale: 'en',
    campaignLocales: Object.freeze(['en']),
    webAvailable: true,
    marketingActive: true,
    name: 'Ireland',
    nativeName: 'Ireland',
    pathSegment: 'ie',
    appleUrl: APPLE_APP_STORE_IE_URL,
    play: 'ie',
  }),
  CA: Object.freeze({
    code: 'CA',
    enabled: true,
    locales: Object.freeze(['en']),
    defaultLocale: 'en',
    campaignLocales: Object.freeze(['en']),
    webAvailable: true,
    marketingActive: true,
    name: 'Canada',
    nativeName: 'Canada',
    pathSegment: 'ca',
    appleUrl: APPLE_APP_STORE_CA_URL,
    play: 'soon',
  }),
  NL: Object.freeze({
    code: 'NL',
    enabled: true,
    locales: Object.freeze(['nl', 'en']),
    defaultLocale: 'nl',
    campaignLocales: Object.freeze(['nl']),
    webAvailable: true,
    marketingActive: false,
    name: 'Netherlands',
    nativeName: 'Nederland',
    pathSegment: 'nl',
    appleUrl: APPLE_APP_STORE_GEO_NEUTRAL_URL,
    play: 'generic',
  }),
});

function marketByCode(code) {
  if (!code) return null;
  return MARKETS[String(code).trim().toUpperCase()] || null;
}

function campaignPath(market, localeCode) {
  const locale = localeByCode(localeCode);
  if (!market || !locale || !locale.pathPrefix) return null;
  if (!market.campaignLocales.includes(locale.code)) return null;
  return `${locale.pathPrefix}/${market.pathSegment}`;
}

function marketForPublicPath(pathname) {
  const p = normalizeWebPath(pathname);
  for (const market of Object.values(MARKETS)) {
    if (!market.enabled) continue;
    for (const localeCode of market.campaignLocales) {
      if (campaignPath(market, localeCode) === p) {
        return { market, locale: localeByCode(localeCode) };
      }
    }
  }
  return null;
}

function marketsForLocale(localeCode) {
  const locale = localeByCode(localeCode);
  if (!locale) return [];
  return Object.values(MARKETS).filter((market) => (
    market.enabled && market.campaignLocales.includes(locale.code)
  ));
}

function playUrlForMarket(market) {
  if (!market || market.play === 'soon') return null;
  if (market.play === 'ie') return getIrelandPlayStoreUrl();
  if (market.play === 'generic') return getPlayStoreUrl();
  return null;
}

/**
 * Read-only view of the existing commercial policy. Does not define a new offer.
 */
function marketCommercialFacts(code) {
  const policy = getMarketCommercialPolicy(code);
  const gateKey = gateKeyForCountry(code);
  return Object.freeze({
    countryCode: policy.countryCode,
    entitlement: policy.entitlement,
    trialDays: policy.trialDays,
    requiresBillingReady: policy.requiresBillingReady,
    complimentary: policy.entitlement === ENTITLEMENT.COMPLIMENTARY_UNTIL,
    registrationGate: gateKey,
    registrationOpenByDefault: GATE_DEFAULTS[gateKey] === true,
  });
}

function localeMarketQueryPath(pathname, query) {
  const p = normalizeWebPath(pathname);
  const locale = localeByCode(p.slice(1));
  if (!locale || p !== locale.pathPrefix) return null;
  const source = query || {};
  const raw = String(source.country || source.market || '').trim();
  if (!/^[A-Za-z]{2}$/.test(raw)) return null;
  const market = marketByCode(raw);
  const target = market && campaignPath(market, locale.code);
  if (!target) return null;
  const params = new URLSearchParams();
  Object.keys(source).forEach((key) => {
    if (key === 'country' || key === 'market') return;
    const value = source[key];
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      if (item == null) return;
      params.append(key, String(item));
    });
  });
  const q = params.toString();
  return target + (q ? `?${q}` : '');
}

module.exports = {
  MARKETS,
  marketByCode,
  campaignPath,
  marketForPublicPath,
  marketsForLocale,
  playUrlForMarket,
  marketCommercialFacts,
  localeMarketQueryPath,
};
