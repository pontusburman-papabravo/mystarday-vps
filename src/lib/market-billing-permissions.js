'use strict';

/**
 * Market billing permissions — five explicit rights (ADR-023 / IE-before-Oct-1).
 *
 * 1. mayRegisterNewFamily      — market registration + billing readiness
 * 2. mayStartNewPurchase       — global infra + market commercial purchase open
 * 3. mayRestorePurchase        — global infra only (not acquisition-gated)
 * 4. mayReceiveSubscriptionWebhook — always (server-side; no market gate)
 * 5. mayUseExistingEntitlement — always (resolver honors store/admin/gift rows)
 *
 * BILLING_UI_DISABLED remains the global emergency kill switch for client IAP SDK.
 */

const {
  evaluatePublicSignupReadiness,
} = require('./market-launch-invariants');
const { isPublicBillingUsable } = require('./market-launch-invariants');
const {
  isMarketPurchaseAllowed,
  isMarketBillingReady,
} = require('./payment-settings');
const {
  getNativePurchaseEligibility,
  getNativeRestoreEligibility,
} = require('./iap-native-purchase-gate');

async function isGlobalBillingInfrastructureReady() {
  return isPublicBillingUsable();
}

/**
 * @param {string} countryCode
 * @param {{ now?: Date }} [opts]
 */
async function mayRegisterNewFamily(countryCode, opts = {}) {
  const readiness = await evaluatePublicSignupReadiness(countryCode, opts);
  return {
    allowed: readiness.allowed === true,
    reason: readiness.reason,
    code: readiness.code,
  };
}

/**
 * @param {string | null | undefined} familyId
 * @param {{ checkGlobalRollout?: boolean }} [opts]
 */
async function mayStartNewPurchase(familyId, opts = {}) {
  return getNativePurchaseEligibility(familyId, {
    checkGlobalRollout: true,
    ...opts,
  });
}

/**
 * @param {string | null | undefined} familyId
 * @param {{ checkGlobalRollout?: boolean }} [opts]
 */
async function mayRestorePurchase(familyId, opts = {}) {
  return getNativeRestoreEligibility(familyId, {
    checkGlobalRollout: true,
    ...opts,
  });
}

/** RevenueCat webhooks are never blocked by market acquisition gates. */
function mayReceiveSubscriptionWebhook() {
  return true;
}

/** Entitlement resolver always honors existing active rows. */
function mayUseExistingEntitlement() {
  return true;
}

module.exports = {
  isGlobalBillingInfrastructureReady,
  isMarketBillingReady,
  isMarketPurchaseAllowed,
  mayRegisterNewFamily,
  mayStartNewPurchase,
  mayRestorePurchase,
  mayReceiveSubscriptionWebhook,
  mayUseExistingEntitlement,
};
