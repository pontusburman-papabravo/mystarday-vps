'use strict';

/**
 * Payment V1 admin-configurable settings (app_settings + app_config).
 */
const appSettings = require('../../db/app-settings');
const appConfig = require('../../db/app-config');
const { normalizeCountryCode } = require('./market-region');
const { parseMarketPaymentStartInstant } = require('./zoned-civil-time');
const { COUNTRY_DEFAULTS } = require('./market-config');
const { getMarketCommercialPolicy } = require('./market-commercial-policy');

const { DateTime } = require('luxon');

const PAYMENT_START_AT_KEY = 'payment_start_at';
const DEFAULT_PAYMENT_START_AT = '2026-10-01T00:00:00+02:00';

const LIFETIME_FREE_UNTIL_KEY = 'lifetime_free_until';
/** Families created strictly before this instant (Europe/Stockholm) are lifetime-free. */
const DEFAULT_LIFETIME_FREE_UNTIL = '2026-09-14T00:00:00+02:00';

/**
 * Grandfathering is worldwide by registration date (`lifetime_free_until`).
 * Country is not a filter. Kept as an empty set so old imports do not invent SE-only scope.
 */
const GRANDFATHER_ELIGIBLE_COUNTRY_CODES = Object.freeze(new Set());

/**
 * Historical IE/FI prebilling helper. Trial-policy markets (ADR-023) skip this path
 * in the resolver. Do not use it as Ireland's launch model.
 */
const PREBILLING_LAUNCH_COUNTRY_CODES = Object.freeze(new Set(['IE', 'FI']));
const MARKET_PAYMENT_START_AT_KEYS = Object.freeze({
  IE: 'market_ie_payment_start_at',
  FI: 'market_fi_payment_start_at',
});
/**
 * No commercial IE/FI paid-start date is committed.
 * Missing market_*_payment_start_at fails closed (no implied Stockholm midnight).
 */

const GIFT_DEFAULTS = Object.freeze({
  gift_cards_enabled: true,
  gift_cards_sales_enabled: true,
  gift_price_sek: 590,
  gift_premium_months: 12,
  gift_redemption_validity_months: 12,
  gift_max_schedule_months: 6,
  gift_delivery_postpone_days: 7,
  gift_online_checkout_max: 99,
  gift_discount_contact_threshold: 25,
  gift_invoice_threshold: 100,
});

async function getPaymentStartAt() {
  const raw = await appSettings.getSetting(PAYMENT_START_AT_KEY);
  if (raw == null || raw === '') {
    return new Date(DEFAULT_PAYMENT_START_AT);
  }
  const iso = typeof raw === 'string' ? raw : String(raw).replace(/^"|"$/g, '');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return new Date(DEFAULT_PAYMENT_START_AT);
  }
  return d;
}

async function setPaymentStartAt(isoString, { updatedByAdminId } = {}) {
  if (!isoString || Number.isNaN(new Date(isoString).getTime())) {
    throw new Error('Invalid payment_start_at');
  }
  await appSettings.upsertSetting(PAYMENT_START_AT_KEY, isoString);
  await appConfig.set(PAYMENT_START_AT_KEY, isoString, {
    description: 'Canonical IAP go-live instant (Europe/Stockholm). Not the lifetime-free cutoff.',
    updatedBy: updatedByAdminId || null,
  }).catch(() => {});
  return new Date(isoString);
}

function parseSettingInstant(raw, fallbackIso) {
  if (raw == null || raw === '') {
    return new Date(fallbackIso);
  }
  const iso = typeof raw === 'string' ? raw : String(raw).replace(/^"|"$/g, '');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return new Date(fallbackIso);
  }
  return d;
}

async function getLifetimeFreeUntil() {
  const raw = await appSettings.getSetting(LIFETIME_FREE_UNTIL_KEY);
  return parseSettingInstant(raw, DEFAULT_LIFETIME_FREE_UNTIL);
}

async function setLifetimeFreeUntil(isoString, { updatedByAdminId } = {}) {
  if (!isoString || Number.isNaN(new Date(isoString).getTime())) {
    throw new Error('Invalid lifetime_free_until');
  }
  await appSettings.upsertSetting(LIFETIME_FREE_UNTIL_KEY, isoString);
  await appConfig.set(LIFETIME_FREE_UNTIL_KEY, isoString, {
    description: 'Lifetime-free registration cutoff (Europe/Stockholm). Later signups get one intro year.',
    updatedBy: updatedByAdminId || null,
  }).catch(() => {});
  return new Date(isoString);
}

function parseInstant(value) {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function introYearExpiresAt(createdAt) {
  const created = parseInstant(createdAt);
  if (!created) return null;
  return DateTime.fromJSDate(created, { zone: 'utc' }).plus({ years: 1 }).toJSDate();
}

async function getGiftSettings() {
  const keys = Object.keys(GIFT_DEFAULTS);
  const entries = await Promise.all(keys.map((k) => appSettings.getSetting(k).then((v) => [k, v])));
  const out = { ...GIFT_DEFAULTS };
  for (const [k, v] of entries) {
    if (v != null) out[k] = v;
  }
  return out;
}

async function setGiftSetting(key, value) {
  if (!(key in GIFT_DEFAULTS)) {
    throw new Error(`Unknown gift setting: ${key}`);
  }
  await appSettings.upsertSetting(key, value);
  return value;
}

function isFamilyBeforePaymentStart(familyCreatedAt, paymentStartAt) {
  if (familyCreatedAt == null || paymentStartAt == null || paymentStartAt === '') {
    return false;
  }
  const created = familyCreatedAt instanceof Date ? familyCreatedAt : new Date(familyCreatedAt);
  const cutoff = paymentStartAt instanceof Date ? paymentStartAt : new Date(paymentStartAt);
  if (Number.isNaN(created.getTime()) || Number.isNaN(cutoff.getTime())) {
    return false;
  }
  return created.getTime() < cutoff.getTime();
}

/**
 * Worldwide grandfather eligibility by registration instant.
 * `lifetimeFreeUntil` is the cutoff; `paymentStartAt` is a legacy alias for tests.
 * Country is ignored. Existing explicit grandfather rows are never revoked elsewhere.
 *
 * @param {{ countryCode?: string|null, createdAt: Date|string, paymentStartAt?: Date|string, lifetimeFreeUntil?: Date|string }} input
 */
function isFamilyEligibleForGrandfathering({ createdAt, paymentStartAt, lifetimeFreeUntil }) {
  const cutoff = lifetimeFreeUntil || paymentStartAt;
  return isFamilyBeforePaymentStart(createdAt, cutoff);
}

function isFamilyEligibleForIntroYear({
  countryCode,
  createdAt,
  paymentStartAt,
  lifetimeFreeUntil,
}) {
  if (getMarketCommercialPolicy(countryCode).entitlement !== 'intro_year') {
    return false;
  }
  const created = parseInstant(createdAt);
  const cutoff = parseInstant(lifetimeFreeUntil || paymentStartAt);
  if (!created || !cutoff) return false;
  return created.getTime() >= cutoff.getTime();
}

function parsePaymentStartValue(raw, fallbackIso) {
  return parseSettingInstant(raw, fallbackIso);
}

/**
 * Canonical paid-start instant for a country.
 * SE uses existing payment_start_at. IE/FI use market_* keys (independent dates).
 */
function paymentStartTimeZoneForCountry(countryCode) {
  const cc = normalizeCountryCode(countryCode);
  if (!cc) return null;
  return (COUNTRY_DEFAULTS[cc] && COUNTRY_DEFAULTS[cc].timezone) || null;
}

/**
 * @returns {Promise<{ instant: Date|null, configured: boolean, invalid: boolean, timeZone: string|null, representation: string|null }>}
 */
async function resolvePaymentStartForCountry(countryCode) {
  const cc = normalizeCountryCode(countryCode);
  if (!cc) {
    return {
      instant: null,
      configured: false,
      invalid: false,
      timeZone: null,
      representation: null,
    };
  }
  const timeZone = paymentStartTimeZoneForCountry(cc);
  if (cc === 'SE' || !MARKET_PAYMENT_START_AT_KEYS[cc]) {
    const instant = await getPaymentStartAt();
    return {
      instant,
      configured: true,
      invalid: false,
      timeZone: timeZone || 'Europe/Stockholm',
      representation: 'absolute',
    };
  }
  const raw = await appSettings.getSetting(MARKET_PAYMENT_START_AT_KEYS[cc]);
  return parseMarketPaymentStartInstant(raw, timeZone);
}

async function getPaymentStartAtForCountry(countryCode) {
  const resolved = await resolvePaymentStartForCountry(countryCode);
  return resolved.instant;
}

async function setPaymentStartAtForCountry(countryCode, isoString, { updatedByAdminId } = {}) {
  const cc = normalizeCountryCode(countryCode);
  if (!cc) {
    throw new Error('Country required for market payment start');
  }
  if (cc === 'SE') {
    return setPaymentStartAt(isoString, { updatedByAdminId });
  }
  const marketKey = MARKET_PAYMENT_START_AT_KEYS[cc];
  if (!marketKey) {
    throw new Error(`No market payment start key for ${cc}`);
  }
  const timeZone = paymentStartTimeZoneForCountry(cc);
  const parsed = parseMarketPaymentStartInstant(isoString, timeZone);
  if (!parsed.configured || parsed.invalid || !parsed.instant) {
    throw new Error(`Invalid ${marketKey}`);
  }
  await appSettings.upsertSetting(marketKey, isoString);
  await appConfig.set(marketKey, isoString, {
    description: `Paid-start cutoff for ${cc} prebilling launch access`,
    updatedBy: updatedByAdminId || null,
  }).catch(() => {});
  return parsed.instant;
}

/**
 * Temporary IE/FI launch access — never Swedish grandfathering.
 */
function isFamilyEligibleForPrebillingAccess({ countryCode, createdAt, paymentStartAt }) {
  const cc = normalizeCountryCode(countryCode);
  if (!PREBILLING_LAUNCH_COUNTRY_CODES.has(cc)) {
    return false;
  }
  return isFamilyBeforePaymentStart(createdAt, paymentStartAt);
}

function isPrebillingLaunchWindowOpen(countryCode, now, paymentStartAt) {
  const cc = normalizeCountryCode(countryCode);
  if (!PREBILLING_LAUNCH_COUNTRY_CODES.has(cc)) {
    return false;
  }
  return isFamilyBeforePaymentStart(now, paymentStartAt);
}

/**
 * Temporary launch access for an existing IE/FI family.
 * Ends at country payment_start_at. If billing is still unusable after that
 * instant, access is held until public billing becomes usable (ops-late safety).
 * Never Swedish grandfathering.
 */
function isPrebillingAccessActive({
  countryCode,
  createdAt,
  paymentStartAt,
  now,
  publicBillingUsable,
}) {
  if (!isFamilyEligibleForPrebillingAccess({ countryCode, createdAt, paymentStartAt })) {
    return false;
  }
  if (isPrebillingLaunchWindowOpen(countryCode, now, paymentStartAt)) {
    return true;
  }
  return publicBillingUsable === false;
}

module.exports = {
  PAYMENT_START_AT_KEY,
  DEFAULT_PAYMENT_START_AT,
  LIFETIME_FREE_UNTIL_KEY,
  DEFAULT_LIFETIME_FREE_UNTIL,
  GIFT_DEFAULTS,
  GRANDFATHER_ELIGIBLE_COUNTRY_CODES,
  PREBILLING_LAUNCH_COUNTRY_CODES,
  MARKET_PAYMENT_START_AT_KEYS,
  getPaymentStartAt,
  setPaymentStartAt,
  getLifetimeFreeUntil,
  setLifetimeFreeUntil,
  introYearExpiresAt,
  paymentStartTimeZoneForCountry,
  resolvePaymentStartForCountry,
  getPaymentStartAtForCountry,
  setPaymentStartAtForCountry,
  getGiftSettings,
  setGiftSetting,
  isFamilyBeforePaymentStart,
  isFamilyEligibleForGrandfathering,
  isFamilyEligibleForIntroYear,
  isFamilyEligibleForPrebillingAccess,
  isPrebillingLaunchWindowOpen,
  isPrebillingAccessActive,
};
