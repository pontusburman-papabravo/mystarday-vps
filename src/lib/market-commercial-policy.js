'use strict';

/**
 * Market commercial policy — entitlement model per country.
 * Not a live flag. Does not open markets.
 *
 * Sweden keeps intro year. Every other country defaults to a 7-day product
 * trial that requires public billing before signup (ADR-023).
 */

const { DateTime } = require('luxon');
const { normalizeCountryCode } = require('./market-region');
const { COUNTRY_DEFAULTS, EU_REGION_DEFAULTS } = require('./market-config');

const ENTITLEMENT = Object.freeze({
  INTRO_YEAR: 'intro_year',
  TRIAL: 'trial',
});

const DEFAULT_TRIAL_DAYS = 7;

/** Sweden is the only intro-year market. New markets inherit trial policy. */
const INTRO_YEAR_COUNTRY_CODES = Object.freeze(new Set(['SE']));

function getMarketCommercialPolicy(countryCode) {
  // Missing/invalid code follows family.country_code DEFAULT 'SE' (legacy rows).
  const cc = normalizeCountryCode(countryCode) || 'SE';
  if (INTRO_YEAR_COUNTRY_CODES.has(cc)) {
    return Object.freeze({
      countryCode: cc,
      entitlement: ENTITLEMENT.INTRO_YEAR,
      trialDays: 0,
      requiresBillingReady: false,
    });
  }
  return Object.freeze({
    countryCode: cc,
    entitlement: ENTITLEMENT.TRIAL,
    trialDays: DEFAULT_TRIAL_DAYS,
    requiresBillingReady: true,
  });
}

function defaultTimeZoneForCountry(countryCode) {
  const cc = normalizeCountryCode(countryCode);
  if (cc && COUNTRY_DEFAULTS[cc] && COUNTRY_DEFAULTS[cc].timezone) {
    return COUNTRY_DEFAULTS[cc].timezone;
  }
  return EU_REGION_DEFAULTS.timezone;
}

/**
 * trial_ends_at = created_at + trialDays in the family timezone (Luxon plus days).
 * @param {Date|string|null} createdAt
 * @param {{ timeZone?: string|null, trialDays?: number, countryCode?: string|null }} [opts]
 * @returns {Date|null}
 */
function trialEndsAt(createdAt, opts = {}) {
  if (createdAt == null || createdAt === '') return null;
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;
  const trialDays = Number.isFinite(opts.trialDays) ? opts.trialDays : DEFAULT_TRIAL_DAYS;
  if (trialDays <= 0) return null;
  const timeZone = opts.timeZone || defaultTimeZoneForCountry(opts.countryCode) || 'UTC';
  return DateTime.fromJSDate(created, { zone: timeZone }).plus({ days: trialDays }).toJSDate();
}

function isComputedTrialActive({
  countryCode,
  createdAt,
  now,
  timeZone,
} = {}) {
  const policy = getMarketCommercialPolicy(countryCode);
  if (policy.entitlement !== ENTITLEMENT.TRIAL) return false;
  const ends = trialEndsAt(createdAt, {
    timeZone,
    trialDays: policy.trialDays,
    countryCode,
  });
  if (!ends) return false;
  const clock = now instanceof Date ? now : new Date(now || Date.now());
  return clock.getTime() < ends.getTime();
}

module.exports = {
  ENTITLEMENT,
  DEFAULT_TRIAL_DAYS,
  INTRO_YEAR_COUNTRY_CODES,
  getMarketCommercialPolicy,
  defaultTimeZoneForCountry,
  trialEndsAt,
  isComputedTrialActive,
};
