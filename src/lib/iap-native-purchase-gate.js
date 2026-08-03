'use strict';

const { isSandboxTestFamily } = require('../../config/revenuecat-iap');

/**
 * Native StoreKit / Play Billing (via RevenueCat SDK) — sandbox QA families only.
 * Does not read payment_enabled or BILLING_UI_DISABLED so prod kill switches stay unchanged.
 *
 * @param {string | null | undefined} familyId
 * @returns {{ allowed: boolean, reason: string }}
 */
function getNativePurchaseEligibility(familyId) {
  if (!familyId || typeof familyId !== 'string') {
    return { allowed: false, reason: 'no_family' };
  }
  if (!isSandboxTestFamily(familyId)) {
    return { allowed: false, reason: 'not_sandbox_family' };
  }
  return { allowed: true, reason: 'sandbox_family' };
}

module.exports = {
  getNativePurchaseEligibility,
};
