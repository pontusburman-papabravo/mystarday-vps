'use strict';

/**
 * Family market / jurisdiction helpers.
 * Language (preferred_locale) and market (country_code → market_region) are independent.
 * See docs/adr/ADR-018-family-market-jurisdiction.md
 */

const db = require('./db');
const { EU_EEA_ISO_CODES } = require('../../config/market-countries');

const MARKET_REGIONS = Object.freeze({
  EU: 'EU',
  UK: 'UK',
  US: 'US',
  OTHER: 'OTHER',
});

const UK_FLAG_KEY = 'market_uk_open';
const US_FLAG_KEY = 'market_us_open';

const KNOWN_COUNTRY_CODES = new Set([
  ...EU_EEA_ISO_CODES,
  'GB',
  'US',
  'ZZ',
]);

function normalizeCountryCode(input) {
  if (input == null || input === '') return null;
  const code = String(input).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return code;
}

function deriveMarketRegion(countryCode) {
  const code = normalizeCountryCode(countryCode) || 'SE';
  if (code === 'GB') return MARKET_REGIONS.UK;
  if (code === 'US') return MARKET_REGIONS.US;
  if (code === 'ZZ') return MARKET_REGIONS.OTHER;
  if (code === 'SE' || EU_EEA_ISO_CODES.has(code)) return MARKET_REGIONS.EU;
  return MARKET_REGIONS.OTHER;
}

function isKnownRegistrationCountryCode(countryCode) {
  const code = normalizeCountryCode(countryCode);
  return code != null && KNOWN_COUNTRY_CODES.has(code);
}

async function readMarketGateFlag(key) {
  try {
    const result = await db.query(
      'SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1',
      [key]
    );
    if (!result.rows.length) return false;
    return result.rows[0].enabled === true;
  } catch (err) {
    console.error('[market-region] flag read failed:', key, err.message);
    return false;
  }
}

/**
 * Whether new registration is allowed for this country/market.
 * UK and US are closed until respective readiness gates are ON.
 */
async function isMarketOpenForRegistration(countryCode) {
  const code = normalizeCountryCode(countryCode) || 'SE';
  const region = deriveMarketRegion(code);
  if (region === MARKET_REGIONS.UK) {
    return readMarketGateFlag(UK_FLAG_KEY);
  }
  if (region === MARKET_REGIONS.US) {
    return readMarketGateFlag(US_FLAG_KEY);
  }
  return true;
}

function resolveRegistrationCountry({
  countryCodeRaw,
  localeExplicitlyChosen = false,
}) {
  const normalized = normalizeCountryCode(countryCodeRaw);
  if (normalized && isKnownRegistrationCountryCode(normalized)) {
    return {
      country_code: normalized,
      market_region: deriveMarketRegion(normalized),
      country_selection_source: localeExplicitlyChosen ? 'registration' : 'legacy_default',
    };
  }
  return {
    country_code: 'SE',
    market_region: MARKET_REGIONS.EU,
    country_selection_source: 'legacy_default',
  };
}

module.exports = {
  MARKET_REGIONS,
  UK_FLAG_KEY,
  US_FLAG_KEY,
  normalizeCountryCode,
  deriveMarketRegion,
  isKnownRegistrationCountryCode,
  isMarketOpenForRegistration,
  resolveRegistrationCountry,
};
