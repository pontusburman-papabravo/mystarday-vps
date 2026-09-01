'use strict';

/**
 * Operational IAP paid-rollout authority.
 *
 * Fail-closed. Health previously reported a hardcoded false; that field is now
 * this runtime gate. Public paid billing also requires payment_enabled and
 * billing UI (see isPublicBillingUsable).
 *
 * This is not founder market-open approval and not store evidence.
 */

const appSettings = require('../../db/app-settings');

const IAP_PAID_ROLLOUT_READY_KEY = 'iap_paid_rollout_ready';

function envIapPaidRolloutForcedOff() {
  const v = process.env.IAP_PAID_ROLLOUT_READY;
  return v === '0' || v === 'false' || v === 'no';
}

function settingIsReady(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

/**
 * @returns {Promise<boolean>}
 */
async function isIapPaidRolloutReady() {
  if (envIapPaidRolloutForcedOff()) return false;
  const raw = await appSettings.getIapPaidRolloutReady();
  return settingIsReady(raw);
}

module.exports = {
  IAP_PAID_ROLLOUT_READY_KEY,
  envIapPaidRolloutForcedOff,
  isIapPaidRolloutReady,
};
