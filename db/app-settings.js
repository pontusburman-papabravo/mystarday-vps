// App settings: key-value store for global configuration.
// Does NOT own subscription_addons — see db/subscription-addons.js.

const { query } = require('../src/lib/db');

function getSetting(key) {
  return query('SELECT value FROM app_settings WHERE key = $1', [key])
    .then(r => (r.rows[0] ? r.rows[0].value : null));
}

function upsertSetting(key, value) {
  return query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()
     RETURNING *`,
    [key, JSON.stringify(value)]
  );
}

function getPaymentEnabled() {
  return getSetting('payment_enabled').then(v => v ?? false);
}

function setPaymentEnabled(enabled) {
  return upsertSetting('payment_enabled', enabled);
}

function getBasicPrice() {
  return getSetting('basic_price_sek').then(v => v ?? 59);
}

function setBasicPrice(price) {
  return upsertSetting('basic_price_sek', price);
}

function getBasicTrialDays() {
  return getSetting('basic_trial_days').then(v => v ?? 14);
}

function setBasicTrialDays(days) {
  return upsertSetting('basic_trial_days', days);
}

function getFounderFamilyLimit() {
  return getSetting('founder_family_limit').then(v => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : 200;
  });
}

function setFounderFamilyLimit(limit) {
  return upsertSetting('founder_family_limit', limit);
}

function getAllSettings() {
  return query('SELECT key, value FROM app_settings ORDER BY key');
}

// Stripe IDs — persisted after POST /api/stripe-setup/create
function getStripePriceId() {
  return getSetting('stripe_price_id');
}
function setStripePriceId(id) {
  return upsertSetting('stripe_price_id', id);
}
function getStripeProductId() {
  return getSetting('stripe_product_id');
}
function setStripeProductId(id) {
  return upsertSetting('stripe_product_id', id);
}

module.exports = {
  getSetting, upsertSetting,
  getPaymentEnabled, setPaymentEnabled,
  getBasicPrice, setBasicPrice,
  getBasicTrialDays, setBasicTrialDays,
  getFounderFamilyLimit, setFounderFamilyLimit,
  getAllSettings,
  getStripePriceId, setStripePriceId,
  getStripeProductId, setStripeProductId,
};