'use strict';

/**
 * First-25 launch cohort. Not a second payment model.
 *
 * When the global flag and the country row are both on, the first 25
 * eligible families in that country receive Premium for 12 calendar months
 * from the assignment instant. No payment method. No automatic charge.
 * Sweden, Ireland and Canada are excluded. Family 26+ keeps the ordinary
 * market commercial policy (ADR-023 / ADR-024 / ADR-025).
 *
 * The end instant is the same local clock time, 12 calendar months later,
 * in the country's offer zone. Luxon clamps a day the target month does not
 * have (29 February + 12 months → 28 February). The stored timestamptz is
 * exclusive: access lasts while now < expires_at. Country, language and
 * reinstall do not move that instant.
 */

const { DateTime } = require('luxon');
const { normalizeCountryCode } = require('./market-region');

const LAUNCH_COHORT_FLAG_KEY = 'launch_cohort_offer_v1';
const LAUNCH_COHORT_SOURCE = 'launch_cohort';
const LAUNCH_COHORT_SLOT_LIMIT = 25;
const LAUNCH_COHORT_OFFER_MONTHS = 12;
const LAUNCH_COHORT_EXPIRING_SOON_DAYS = 30;

/** Markets whose existing commercial terms must not be rewritten. */
const LAUNCH_COHORT_EXCLUDED_COUNTRY_CODES = Object.freeze(['SE', 'IE', 'CA']);

/**
 * New European markets that may receive the offer. Not opened by this list.
 * EU except Sweden and Ireland, plus Norway and Iceland.
 */
const LAUNCH_COHORT_ELIGIBLE_COUNTRY_CODES = Object.freeze([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI',
  'ES', 'NO', 'IS',
]);

/** Offer clock only. Does not change family.timezone or the schedule. */
const LAUNCH_COHORT_TIME_ZONES = Object.freeze({
  AT: 'Europe/Vienna',
  BE: 'Europe/Brussels',
  BG: 'Europe/Sofia',
  HR: 'Europe/Zagreb',
  CY: 'Asia/Nicosia',
  CZ: 'Europe/Prague',
  DK: 'Europe/Copenhagen',
  EE: 'Europe/Tallinn',
  FI: 'Europe/Helsinki',
  FR: 'Europe/Paris',
  DE: 'Europe/Berlin',
  GR: 'Europe/Athens',
  HU: 'Europe/Budapest',
  IT: 'Europe/Rome',
  LV: 'Europe/Riga',
  LT: 'Europe/Vilnius',
  LU: 'Europe/Luxembourg',
  MT: 'Europe/Malta',
  NL: 'Europe/Amsterdam',
  PL: 'Europe/Warsaw',
  PT: 'Europe/Lisbon',
  RO: 'Europe/Bucharest',
  SK: 'Europe/Bratislava',
  SI: 'Europe/Ljubljana',
  ES: 'Europe/Madrid',
  NO: 'Europe/Oslo',
  IS: 'Atlantic/Reykjavik',
});

const EXCLUDED_SET = new Set(LAUNCH_COHORT_EXCLUDED_COUNTRY_CODES);
const ELIGIBLE_SET = new Set(LAUNCH_COHORT_ELIGIBLE_COUNTRY_CODES);

/**
 * Stored sources that already grant Premium. A cohort slot must not replace them.
 * Computed trial and complimentary are not rows and are not in this list.
 */
const LAUNCH_COHORT_PROTECTED_SOURCES = Object.freeze([
  'grandfathered',
  'admin',
  'apple',
  'google',
  'gift',
  'intro_year',
]);

function isLaunchCohortExcludedCountry(countryCode) {
  const cc = normalizeCountryCode(countryCode);
  return Boolean(cc && EXCLUDED_SET.has(cc));
}

function isLaunchCohortEligibleCountry(countryCode) {
  const cc = normalizeCountryCode(countryCode);
  return Boolean(cc && ELIGIBLE_SET.has(cc));
}

function offerTimeZoneForCountry(countryCode) {
  const cc = normalizeCountryCode(countryCode);
  return (cc && LAUNCH_COHORT_TIME_ZONES[cc]) || 'UTC';
}

/**
 * Exclusive end instant. Same local wall time, 12 calendar months later.
 * @param {Date|string|number} grantedAt
 * @param {string} timeZone
 * @returns {Date}
 */
function launchCohortEndsAt(grantedAt, timeZone) {
  const zone = timeZone || 'UTC';
  const start = grantedAt instanceof Date
    ? DateTime.fromJSDate(grantedAt, { zone })
    : DateTime.fromISO(String(grantedAt), { zone });
  if (!start.isValid) {
    throw new Error('Launch cohort grant instant is not a valid date');
  }
  const end = start.plus({ months: LAUNCH_COHORT_OFFER_MONTHS });
  if (!end.isValid) {
    throw new Error('Launch cohort end instant is not a valid date');
  }
  return end.toJSDate();
}

module.exports = {
  LAUNCH_COHORT_FLAG_KEY,
  LAUNCH_COHORT_SOURCE,
  LAUNCH_COHORT_SLOT_LIMIT,
  LAUNCH_COHORT_OFFER_MONTHS,
  LAUNCH_COHORT_EXPIRING_SOON_DAYS,
  LAUNCH_COHORT_EXCLUDED_COUNTRY_CODES,
  LAUNCH_COHORT_ELIGIBLE_COUNTRY_CODES,
  LAUNCH_COHORT_TIME_ZONES,
  LAUNCH_COHORT_PROTECTED_SOURCES,
  isLaunchCohortExcludedCountry,
  isLaunchCohortEligibleCountry,
  offerTimeZoneForCountry,
  launchCohortEndsAt,
};
