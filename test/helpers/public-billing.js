'use strict';

/**
 * Isolated test helper: simulate public billing usable without touching prod flags.
 */
const appSettings = require('../../db/app-settings');

function snapshotBillingEnv() {
  return {
    BILLING_UI_DISABLED: process.env.BILLING_UI_DISABLED,
  };
}

function restoreBillingEnv(snap) {
  if (!snap) return;
  if (snap.BILLING_UI_DISABLED === undefined) delete process.env.BILLING_UI_DISABLED;
  else process.env.BILLING_UI_DISABLED = snap.BILLING_UI_DISABLED;
}

async function enablePublicBillingForTest() {
  const snap = snapshotBillingEnv();
  delete process.env.BILLING_UI_DISABLED;
  await appSettings.setPaymentEnabled(true);
  return snap;
}

async function disablePublicBillingForTest(snap) {
  await appSettings.setPaymentEnabled(false);
  restoreBillingEnv(snap);
}

module.exports = {
  snapshotBillingEnv,
  restoreBillingEnv,
  enablePublicBillingForTest,
  disablePublicBillingForTest,
};
