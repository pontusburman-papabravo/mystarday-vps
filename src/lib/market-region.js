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
  IE: 'market_ie_open',
  FI: 'market_fi_open',
  NO: 'market_no_open',
  DK: 'market_dk_open',
  EU: 'market_eu_open',
  UK: 'market_uk_open',
  US: 'market_us_open',
  OTHER: 'market_other_open',
});

/** Default when feature_flag row is missing (fail-safe: only Sweden open). */
const GATE_DEFAULTS = Object.freeze({
  market_se_open: true,
  market_ie_open: false,
  market_fi_open: false,
  market_no_open: false,
  market_dk_open: false,
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

/** Countries with explicit per-country gates (staged EEA rollout). */
const COUNTRY_SPECIFIC_GATE_KEYS = Object.freeze({
  SE: GATE_KEYS.SE,
  IE: GATE_KEYS.IE,
  FI: GATE_KEYS.FI,
  NO: GATE_KEYS.NO,
  DK: GATE_KEYS.DK,
  GB: GATE_KEYS.UK,
  US: GATE_KEYS.US,
  ZZ: GATE_KEYS.OTHER,
});

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
  if (COUNTRY_SPECIFIC_GATE_KEYS[code]) return COUNTRY_SPECIFIC_GATE_KEYS[code];
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
 * Per-country gates (IE/NO/DK) override the aggregate EU gate.
 */
async function isMarketOpenForRegistration(countryCode) {
  const code = normalizeCountryCode(countryCode);
  if (!code) return false;
  const key = gateKeyForCountry(code);
  return readMarketGateFlag(key);
}

function marketClosedCode(countryCode) {
  const code = normalizeCountryCode(countryCode);
  if (!code) return 'MARKET_COUNTRY_REQUIRED';
  if (code === 'IE') return 'MARKET_IE_CLOSED';
  if (code === 'FI') return 'MARKET_FI_CLOSED';
  if (code === 'NO') return 'MARKET_NO_CLOSED';
  if (code === 'DK') return 'MARKET_DK_CLOSED';
  const region = deriveMarketRegion(code);
  if (region === MARKET_REGIONS.UK) return 'MARKET_UK_CLOSED';
  if (region === MARKET_REGIONS.US) return 'MARKET_US_CLOSED';
  if (code === 'SE') return 'MARKET_SE_CLOSED';
  if (region === MARKET_REGIONS.EU) return 'MARKET_EU_CLOSED';
  return 'MARKET_OTHER_CLOSED';
}

const MARKET_CLOSED_MESSAGES = Object.freeze({
  MARKET_SE_CLOSED: 'Registrering från Sverige är tillfälligt stängd.',
  MARKET_IE_CLOSED: 'My Starday is not available in Ireland yet.',
  MARKET_FI_CLOSED: 'My Starday är inte tillgängligt i Finland ännu.',
  MARKET_NO_CLOSED: 'My Starday is not available in Norway yet.',
  MARKET_DK_CLOSED: 'My Starday is not available in Denmark yet.',
  MARKET_EU_CLOSED: 'My Starday är inte tillgängligt i ditt land ännu. Vi meddelar när vi öppnar fler EU-länder.',
  MARKET_UK_CLOSED: 'My Starday is not available in the United Kingdom yet.',
  MARKET_US_CLOSED: 'My Starday is not available in the United States yet.',
  MARKET_OTHER_CLOSED: 'My Starday is not available in your country yet.',
  MARKET_COUNTRY_REQUIRED: 'Choose a country to continue.',
  MARKET_BILLING_NOT_READY: 'Köp är inte tillgängliga i det här landet ännu, så vi kan inte skapa ett konto som du inte kan använda.',
});

function marketClosedMessage(code) {
  return MARKET_CLOSED_MESSAGES[code] || MARKET_CLOSED_MESSAGES.MARKET_OTHER_CLOSED;
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

/** @typedef {{ code: string, label: string, gateKey: string, marketRegion: string }} MarketRegistrationStatusRow */

const MARKET_STATUS_COUNTRIES = Object.freeze([
  { code: 'SE', label: 'Sweden' },
  { code: 'IE', label: 'Ireland' },
  { code: 'FI', label: 'Finland' },
  { code: 'NO', label: 'Norway' },
  { code: 'DK', label: 'Denmark' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
  { code: 'ZZ', label: 'Other' },
]);

/**
 * Effective registration gate state for admin/ops dashboards.
 * @returns {Promise<MarketRegistrationStatusRow[]>}
 */
async function getMarketRegistrationStatus() {
  const rows = await Promise.all(
    MARKET_STATUS_COUNTRIES.map(async (entry) => {
      const gateKey = gateKeyForCountry(entry.code);
      const open = await readMarketGateFlag(gateKey);
      return {
        code: entry.code,
        label: entry.label,
        gateKey,
        marketRegion: deriveMarketRegion(entry.code),
        open,
      };
    })
  );
  return rows;
}

module.exports = {
  MARKET_REGIONS,
  GATE_KEYS,
  GATE_DEFAULTS,
  COUNTRY_SPECIFIC_GATE_KEYS,
  MARKET_STATUS_COUNTRIES,
  normalizeCountryCode,
  deriveMarketRegion,
  isKnownRegistrationCountryCode,
  gateKeyForCountry,
  isMarketOpenForRegistration,
  marketClosedCode,
  marketClosedMessage,
  resolveRegistrationCountry,
  getMarketRegistrationStatus,
};
