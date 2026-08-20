'use strict';

/**
 * Payment V1 admin-configurable settings (app_settings + app_config).
 */
const appSettings = require('../../db/app-settings');
const appConfig = require('../../db/app-config');
const { normalizeCountryCode } = require('./market-region');

const PAYMENT_START_AT_KEY = 'payment_start_at';
const DEFAULT_PAYMENT_START_AT = '2026-10-01T00:00:00+02:00';

/** Swedish payment_start_at grandfathering applies to SE families only (not worldwide). */
const GRANDFATHER_ELIGIBLE_COUNTRY_CODES = Object.freeze(new Set(['SE']));

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
    description: 'Canonical payment start + grandfather cutoff (Europe/Stockholm)',
    updatedBy: updatedByAdminId || null,
  }).catch(() => {});
  return new Date(isoString);
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
  const created = familyCreatedAt instanceof Date ? familyCreatedAt : new Date(familyCreatedAt);
  const cutoff = paymentStartAt instanceof Date ? paymentStartAt : new Date(paymentStartAt);
  return created.getTime() < cutoff.getTime();
}

/**
 * Country-scoped grandfather eligibility for Swedish payment_start_at cutoff.
 * Existing explicit grandfather entitlement rows are never revoked elsewhere.
 *
 * @param {{ countryCode?: string|null, createdAt: Date|string, paymentStartAt: Date|string }} input
 */
function isFamilyEligibleForGrandfathering({ countryCode, createdAt, paymentStartAt }) {
  const cc = normalizeCountryCode(countryCode) || 'SE';
  if (!GRANDFATHER_ELIGIBLE_COUNTRY_CODES.has(cc)) {
    return false;
  }
  return isFamilyBeforePaymentStart(createdAt, paymentStartAt);
}

module.exports = {
  PAYMENT_START_AT_KEY,
  DEFAULT_PAYMENT_START_AT,
  GIFT_DEFAULTS,
  GRANDFATHER_ELIGIBLE_COUNTRY_CODES,
  getPaymentStartAt,
  setPaymentStartAt,
  getGiftSettings,
  setGiftSetting,
  isFamilyBeforePaymentStart,
  isFamilyEligibleForGrandfathering,
};
