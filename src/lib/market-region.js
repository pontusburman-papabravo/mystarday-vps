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

const GATE_KEYS = Object.freeze({
  SE: 'market_se_open',
  EU: 'market_eu_open',
  UK: 'market_uk_open',
  US: 'market_us_open',
  OTHER: 'market_other_open',
});

/** Default when feature_flag row is missing (fail-safe: only Sweden open). */
const GATE_DEFAULTS = Object.freeze({
  market_se_open: true,
  market_eu_open: false,
  market_uk_open: false,
  market_us_open: false,
  market_other_open: false,
});

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

function gateKeyForCountry(countryCode) {
  const code = normalizeCountryCode(countryCode) || 'SE';
  if (code === 'SE') return GATE_KEYS.SE;
  const region = deriveMarketRegion(code);
  if (region === MARKET_REGIONS.EU) return GATE_KEYS.EU;
  if (region === MARKET_REGIONS.UK) return GATE_KEYS.UK;
  if (region === MARKET_REGIONS.US) return GATE_KEYS.US;
  return GATE_KEYS.OTHER;
}

async function readMarketGateFlag(key) {
  const defaultEnabled = GATE_DEFAULTS[key] === true;
  try {
    const result = await db.query(
      'SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1',
      [key]
    );
    if (!result.rows.length) return defaultEnabled;
    return result.rows[0].enabled === true;
  } catch (err) {
    console.error('[market-region] flag read failed:', key, err.message);
    return defaultEnabled;
  }
}

/**
 * Whether new registration is allowed for this country.
 * Gates are per market segment; Sweden is the only default-open market.
 */
async function isMarketOpenForRegistration(countryCode) {
  const key = gateKeyForCountry(countryCode);
  return readMarketGateFlag(key);
}

function marketClosedCode(countryCode) {
  const code = normalizeCountryCode(countryCode) || 'SE';
  const region = deriveMarketRegion(code);
  if (region === MARKET_REGIONS.UK) return 'MARKET_UK_CLOSED';
  if (region === MARKET_REGIONS.US) return 'MARKET_US_CLOSED';
  if (code === 'SE') return 'MARKET_SE_CLOSED';
  if (region === MARKET_REGIONS.EU) return 'MARKET_EU_CLOSED';
  return 'MARKET_OTHER_CLOSED';
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
  GATE_KEYS,
  GATE_DEFAULTS,
  normalizeCountryCode,
  deriveMarketRegion,
  isKnownRegistrationCountryCode,
  gateKeyForCountry,
  isMarketOpenForRegistration,
  marketClosedCode,
  resolveRegistrationCountry,
};
