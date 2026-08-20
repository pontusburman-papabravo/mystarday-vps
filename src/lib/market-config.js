'use strict';

/**
 * Market configuration resolver — country + region + locale → operational defaults.
 * See docs/international-expansion-v1-engineering-spec.md
 */

const { normalizeCountryCode, deriveMarketRegion, MARKET_REGIONS } = require('./market-region');
const { normalizeLocale, DEFAULT_LOCALE } = require('./locale');
const { resolveLegalRoutes } = require('./legal-routing');

/** @typedef {'SEK'|'EUR'|'NOK'|'DKK'|'GBP'} MarketCurrency */

const COUNTRY_DEFAULTS = Object.freeze({
  SE: Object.freeze({
    timezone: 'Europe/Stockholm',
    currency: 'SEK',
    defaultLocale: 'sv-SE',
  }),
  IE: Object.freeze({
    timezone: 'Europe/Dublin',
    currency: 'EUR',
    defaultLocale: 'en-GB',
  }),
  NO: Object.freeze({
    timezone: 'Europe/Oslo',
    currency: 'NOK',
    defaultLocale: 'nb-NO',
  }),
  DK: Object.freeze({
    timezone: 'Europe/Copenhagen',
    currency: 'DKK',
    defaultLocale: 'da-DK',
  }),
  GB: Object.freeze({
    timezone: 'Europe/London',
    currency: 'GBP',
    defaultLocale: 'en-GB',
  }),
  US: Object.freeze({
    timezone: 'America/New_York',
    currency: 'USD',
    defaultLocale: 'en-GB',
  }),
});

const EU_FALLBACK = Object.freeze({
  timezone: 'Europe/Stockholm',
  currency: 'EUR',
  defaultLocale: 'en-GB',
});

/**
 * @param {{ countryCode?: string|null, marketRegion?: string|null, locale?: string|null }} input
 */
function getMarketConfig(input = {}) {
  const countryCode = normalizeCountryCode(input.countryCode) || 'SE';
  const marketRegion = input.marketRegion || deriveMarketRegion(countryCode);
  const locale = normalizeLocale(input.locale) || DEFAULT_LOCALE;

  const countryDefaults = COUNTRY_DEFAULTS[countryCode]
    || (marketRegion === MARKET_REGIONS.EU ? EU_FALLBACK : EU_FALLBACK);

  const legal = resolveLegalRoutes({ countryCode, marketRegion, locale });

  return {
    countryCode,
    marketRegion,
    locale,
    timezone: countryDefaults.timezone,
    currency: countryDefaults.currency,
    defaultLocale: countryDefaults.defaultLocale,
    legal,
    capabilities: {
      registration: true,
    },
  };
}

module.exports = {
  COUNTRY_DEFAULTS,
  getMarketConfig,
};
