'use strict';

/**
 * Isolated test helper: simulate public billing usable without touching prod flags.
 * Requires app-settings on each call so a reloaded src/lib/db pool is used.
 */

function snapshotBillingEnv() {
  return {
    BILLING_UI_DISABLED: process.env.BILLING_UI_DISABLED,
    IAP_PAID_ROLLOUT_READY: process.env.IAP_PAID_ROLLOUT_READY,
  };
}

function restoreBillingEnv(snap) {
  if (!snap) return;
  if (snap.BILLING_UI_DISABLED === undefined) delete process.env.BILLING_UI_DISABLED;
  else process.env.BILLING_UI_DISABLED = snap.BILLING_UI_DISABLED;
  if (snap.IAP_PAID_ROLLOUT_READY === undefined) delete process.env.IAP_PAID_ROLLOUT_READY;
  else process.env.IAP_PAID_ROLLOUT_READY = snap.IAP_PAID_ROLLOUT_READY;
}

function appSettings() {
  return require('../../db/app-settings');
}

const MARKET_PAYMENT_START_KEYS = {
  IE: 'market_ie_payment_start_at',
  FI: 'market_fi_payment_start_at',
};

/** Past instant so isMarketBillingReady passes in integration tests. */
const PAST_MARKET_PAYMENT_START = '2020-01-01T00:00:00+00:00';

async function enableMarketBillingReadyForTest(countryCodes = []) {
  for (const code of countryCodes) {
    const key = MARKET_PAYMENT_START_KEYS[code];
    if (key) {
      await appSettings().upsertSetting(key, PAST_MARKET_PAYMENT_START);
    }
  }
}

/**
 * @param {{ markets?: string[] }} [opts]
 *   markets — also set per-market payment_start_at in the past (trial-market signup gate).
 */
async function enablePublicBillingForTest(opts = {}) {
  const snap = snapshotBillingEnv();
  delete process.env.BILLING_UI_DISABLED;
  delete process.env.IAP_PAID_ROLLOUT_READY;
  await appSettings().setPaymentEnabled(true);
  await appSettings().setIapPaidRolloutReady(true);
  if (opts.markets?.length) {
    await enableMarketBillingReadyForTest(opts.markets);
  }
  return snap;
}

async function enablePaymentUiWithoutPaidRolloutForTest() {
  const snap = snapshotBillingEnv();
  delete process.env.BILLING_UI_DISABLED;
  delete process.env.IAP_PAID_ROLLOUT_READY;
  await appSettings().setPaymentEnabled(true);
  await appSettings().setIapPaidRolloutReady(false);
  return snap;
}

async function disablePublicBillingForTest(snap) {
  await appSettings().setPaymentEnabled(false);
  await appSettings().setIapPaidRolloutReady(false);
  restoreBillingEnv(snap);
}

module.exports = {
  snapshotBillingEnv,
  restoreBillingEnv,
  MARKET_PAYMENT_START_KEYS,
  PAST_MARKET_PAYMENT_START,
  enableMarketBillingReadyForTest,
  enablePublicBillingForTest,
  enablePaymentUiWithoutPaidRolloutForTest,
  disablePublicBillingForTest,
};
