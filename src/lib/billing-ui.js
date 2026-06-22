/**
 * billing-ui.js — Gate all payment/pricing UI until Apple App Review + explicit enable.
 * Stronger than payment_enabled alone: BILLING_UI_DISABLED=true forces all billing UI off.
 */

const appSettings = require('../../db/app-settings');

function envBillingUiDisabled() {
  const v = process.env.BILLING_UI_DISABLED;
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * @returns {Promise<boolean>} true when pricing/subscription CTAs may be shown in UI
 */
async function isBillingUiEnabled() {
  if (envBillingUiDisabled()) return false;
  const paymentEnabled = await appSettings.getPaymentEnabled();
  return !!paymentEnabled;
}

module.exports = {
  envBillingUiDisabled,
  isBillingUiEnabled,
};
