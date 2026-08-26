'use strict';

/**
 * Market configuration resolver — country + region + locale → operational defaults.
 * See docs/international-expansion-v1-engineering-spec.md
 *
 * Note: `locale` in the return value is the caller's resolved input locale (pre-auth
 * defaults to sv-SE via normalizeLocale). `defaultLocale` is the market's preferred
 * language when none is chosen — they may differ (e.g. IE + omitted locale).
 */

const { normalizeCountryCode, deriveMarketRegion, MARKET_REGIONS } = require('./market-region');
const { normalizeLocale, DEFAULT_LOCALE } = require('./locale');
const { resolveLegalRoutes } = require('./legal-routing');

/** @typedef {'SEK'|'EUR'|'NOK'|'DKK'|'GBP'|'USD'} MarketCurrency */

const COUNTRY_DEFAULTS = Object.freeze({
  SE: Object.freeze({
    timezone: 'Europe/Stockholm',
    currency: 'SEK',
    defaultLocale: 'sv-SE',
    localeSupported: true,
  }),
  IE: Object.freeze({
    timezone: 'Europe/Dublin',
    currency: 'EUR',
    defaultLocale: 'en-GB',
    localeSupported: true,
  }),
  FI: Object.freeze({
    timezone: 'Europe/Helsinki',
    currency: 'EUR',
    defaultLocale: 'en-GB',
    localeSupported: true,
  }),
  NO: Object.freeze({
    timezone: 'Europe/Oslo',
    currency: 'NOK',
    defaultLocale: 'nb-NO',
    /** nb-NO UI is not launch-ready — metadata only for future NO wave */
    localeSupported: false,
  }),
  DK: Object.freeze({
    timezone: 'Europe/Copenhagen',
    currency: 'DKK',
    defaultLocale: 'da-DK',
    /** da-DK UI is not launch-ready — metadata only for future DK wave */
    localeSupported: false,
  }),
  GB: Object.freeze({
    timezone: 'Europe/London',
    currency: 'GBP',
    defaultLocale: 'en-GB',
    localeSupported: true,
  }),
  US: Object.freeze({
    timezone: 'America/New_York',
    currency: 'USD',
    defaultLocale: 'en-GB',
    localeSupported: true,
  }),
});

/** Bulk EU/EEA countries without an explicit per-country row (e.g. DE, FR). */
const EU_REGION_DEFAULTS = Object.freeze({
  timezone: 'Europe/Stockholm',
  currency: 'EUR',
  defaultLocale: 'en-GB',
  localeSupported: true,
});

const UK_REGION_DEFAULTS = Object.freeze({
  timezone: 'Europe/London',
  currency: 'GBP',
  defaultLocale: 'en-GB',
  localeSupported: true,
});

const US_REGION_DEFAULTS = Object.freeze({
  timezone: 'America/New_York',
  currency: 'USD',
  defaultLocale: 'en-GB',
  localeSupported: true,
});

/** Fail-safe for ZZ / unknown codes — do not inherit EU Stockholm defaults. */
const OTHER_REGION_DEFAULTS = Object.freeze({
  timezone: 'UTC',
  currency: 'EUR',
  defaultLocale: 'en-GB',
  localeSupported: false,
});

/**
 * @param {string} countryCode normalized ISO code
 * @param {string} marketRegion
 */
function resolveMarketDefaults(countryCode, marketRegion) {
  if (COUNTRY_DEFAULTS[countryCode]) {
    return COUNTRY_DEFAULTS[countryCode];
  }
  switch (marketRegion) {
    case MARKET_REGIONS.EU:
      return EU_REGION_DEFAULTS;
    case MARKET_REGIONS.UK:
      return UK_REGION_DEFAULTS;
    case MARKET_REGIONS.US:
      return US_REGION_DEFAULTS;
    case MARKET_REGIONS.OTHER:
    default:
      return OTHER_REGION_DEFAULTS;
  }
}

/**
 * @param {{ countryCode?: string|null, marketRegion?: string|null, locale?: string|null }} input
 */
function getMarketConfig(input = {}) {
  const countryCode = normalizeCountryCode(input.countryCode) || 'SE';
  const marketRegion = input.marketRegion || deriveMarketRegion(countryCode);
  const locale = normalizeLocale(input.locale) || DEFAULT_LOCALE;

  const defaults = resolveMarketDefaults(countryCode, marketRegion);
  const legal = resolveLegalRoutes({ countryCode, marketRegion, locale });

  return {
    countryCode,
    marketRegion,
    locale,
    timezone: defaults.timezone,
    currency: defaults.currency,
    defaultLocale: defaults.defaultLocale,
    localeSupported: defaults.localeSupported,
    legal,
    capabilities: {
      registration: true,
    },
  };
}

module.exports = {
  COUNTRY_DEFAULTS,
  EU_REGION_DEFAULTS,
  UK_REGION_DEFAULTS,
  US_REGION_DEFAULTS,
  OTHER_REGION_DEFAULTS,
  resolveMarketDefaults,
  getMarketConfig,
};
