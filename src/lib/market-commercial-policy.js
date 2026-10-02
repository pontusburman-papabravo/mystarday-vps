'use strict';

/**
 * Market commercial policy — entitlement model per country.
 * Not a live flag. Does not open markets.
 *
 * Sweden: intro year for families created before 2026-10-03 00:00
 * Europe/Stockholm (ADR-023). From that instant, new Swedish families get a
 * 14-day product trial and then the paywall (ADR-025). Existing intro-year
 * and grandfather rows are not rewritten.
 * Ireland and Canada share complimentary access until one fixed instant (see
 * ireland-launch-offer.js), not a converting 14-day trial.
 * Every other country defaults to a 14-day product trial that requires
 * public billing before signup (ADR-023). Admin `basic_trial_days` does not
 * own this number.
 */

const { DateTime } = require('luxon');
const { normalizeCountryCode } = require('./market-region');
const { COUNTRY_DEFAULTS, EU_REGION_DEFAULTS } = require('./market-config');
const { COMPLIMENTARY_UNTIL_COUNTRY_CODES } = require('./ireland-launch-offer');

const ENTITLEMENT = Object.freeze({
  INTRO_YEAR: 'intro_year',
  TRIAL: 'trial',
  COMPLIMENTARY_UNTIL: 'complimentary_until',
});

const DEFAULT_TRIAL_DAYS = 14;

/**
 * New Swedish families created at or after this instant get a 14-day product
 * trial. Earlier Swedish families keep grandfather or intro year.
 * 2026-10-03 00:00 Europe/Stockholm (CEST, UTC+2).
 */
const SWEDEN_TRIAL_FROM_ISO = '2026-10-03T00:00:00+02:00';
const SWEDEN_TRIAL_FROM_MS = new Date(SWEDEN_TRIAL_FROM_ISO).getTime();

/** Sweden is the only intro-year market. New markets inherit trial policy. */
const INTRO_YEAR_COUNTRY_CODES = Object.freeze(new Set(['SE']));

function createdAtMillis(createdAt) {
  if (createdAt == null || createdAt === '') return null;
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;
  return created.getTime();
}

/**
 * Swedish product trial applies only when the family's created_at is known
 * and is at or after SWEDEN_TRIAL_FROM. Omitted createdAt stays intro year
 * so undated callers cannot rewrite existing families.
 */
function swedenUsesProductTrial(createdAt) {
  const createdMs = createdAtMillis(createdAt);
  if (createdMs == null) return false;
  return createdMs >= SWEDEN_TRIAL_FROM_MS;
}

function getMarketCommercialPolicy(countryCode, opts = {}) {
  // Missing/invalid code follows family.country_code DEFAULT 'SE' (legacy rows).
  const cc = normalizeCountryCode(countryCode) || 'SE';
  if (INTRO_YEAR_COUNTRY_CODES.has(cc)) {
    if (swedenUsesProductTrial(opts.createdAt)) {
      return Object.freeze({
        countryCode: cc,
        entitlement: ENTITLEMENT.TRIAL,
        trialDays: DEFAULT_TRIAL_DAYS,
        requiresBillingReady: true,
      });
    }
    return Object.freeze({
      countryCode: cc,
      entitlement: ENTITLEMENT.INTRO_YEAR,
      trialDays: 0,
      requiresBillingReady: false,
    });
  }
  if (COMPLIMENTARY_UNTIL_COUNTRY_CODES.has(cc)) {
    return Object.freeze({
      countryCode: cc,
      entitlement: ENTITLEMENT.COMPLIMENTARY_UNTIL,
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
  const policy = getMarketCommercialPolicy(countryCode, { createdAt });
  if (policy.entitlement !== ENTITLEMENT.TRIAL) return false;
  const startMs = createdAtMillis(createdAt);
  const ends = trialEndsAt(createdAt, {
    timeZone,
    trialDays: policy.trialDays,
    countryCode,
  });
  if (startMs == null || !ends) return false;
  const clock = now instanceof Date ? now : new Date(now || Date.now());
  const nowMs = clock.getTime();
  return nowMs >= startMs && nowMs < ends.getTime();
}

module.exports = {
  ENTITLEMENT,
  DEFAULT_TRIAL_DAYS,
  SWEDEN_TRIAL_FROM_ISO,
  INTRO_YEAR_COUNTRY_CODES,
  COMPLIMENTARY_UNTIL_COUNTRY_CODES,
  getMarketCommercialPolicy,
  swedenUsesProductTrial,
  defaultTimeZoneForCountry,
  trialEndsAt,
  isComputedTrialActive,
};
