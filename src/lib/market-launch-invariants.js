'use strict';

/**
 * Launch invariants for public signup vs premium vs billing.
 *
 * signup_allowed =
 *   market_open &&
 *   (grandfather_eligible
 *    || !policy.requiresBillingReady
 *    || publicBillingUsable)
 *
 * Sweden intro-year families may finish registration without public billing.
 * Trial markets (default for new countries) require public billing or they
 * get MARKET_BILLING_NOT_READY — never an account the family cannot use.
 *
 * publicBillingUsable =
 *   payment_enabled && !BILLING_UI_DISABLED && iap_paid_rollout_ready
 *
 * Does not open markets or enable paid rollout. Fail-closed.
 */

const { isBillingUiEnabled } = require('./billing-ui');
const { isIapPaidRolloutReady } = require('./iap-paid-rollout');
const {
  getLifetimeFreeUntil,
  DEFAULT_LIFETIME_FREE_UNTIL,
  isFamilyEligibleForGrandfathering,
} = require('./payment-settings');
const {
  isMarketOpenForRegistration,
  marketClosedCode,
  normalizeCountryCode,
} = require('./market-region');
const { getMarketCommercialPolicy } = require('./market-commercial-policy');

const BILLING_NOT_READY_CODE = 'MARKET_BILLING_NOT_READY';

/**
 * Public (non-sandbox) purchase UI + native IAP eligibility.
 * Same conditions as global rollout in getNativePurchaseEligibility.
 */
async function isPublicBillingUsable() {
  try {
    const [billingUi, paidRolloutReady] = await Promise.all([
      isBillingUiEnabled(),
      isIapPaidRolloutReady(),
    ]);
    return billingUi === true && paidRolloutReady === true;
  } catch (err) {
    console.error('[market-launch] public billing probe failed:', err.message);
    return false;
  }
}

/**
 * Pure decision: given already-read flags, may this country complete public signup?
 * @param {{
 *   countryCode: string,
 *   marketOpen: boolean,
 *   publicBillingUsable: boolean,
 *   paymentStartAt?: Date|string,
 *   lifetimeFreeUntil?: Date|string,
 *   now?: Date,
 * }} input
 */
function evaluateSignupCompleteness(input) {
  const countryCode = normalizeCountryCode(input.countryCode);
  if (!countryCode) {
    return {
      allowed: false,
      reason: 'unknown_country',
      code: marketClosedCode(null),
    };
  }
  if (!input.marketOpen) {
    return {
      allowed: false,
      reason: 'market_closed',
      code: marketClosedCode(countryCode),
    };
  }

  const now = input.now || new Date();
  const lifetimeFreeUntil = input.lifetimeFreeUntil || DEFAULT_LIFETIME_FREE_UNTIL;
  const grandfatherEligible = isFamilyEligibleForGrandfathering({
    countryCode,
    createdAt: now,
    lifetimeFreeUntil,
  });
  if (grandfatherEligible) {
    return { allowed: true, reason: 'grandfather_eligible', code: null };
  }

  const policy = getMarketCommercialPolicy(countryCode);
  if (policy.requiresBillingReady && !input.publicBillingUsable) {
    return {
      allowed: false,
      reason: 'billing_not_ready',
      code: BILLING_NOT_READY_CODE,
    };
  }
  if (policy.entitlement === 'intro_year') {
    return { allowed: true, reason: 'intro_year', code: null };
  }
  return { allowed: true, reason: 'trial', code: null };
}

/**
 * Server-authoritative public signup gate (market + billing deadlock guard).
 * @param {string} countryCode
 * @param {{ now?: Date }} [opts]
 */
async function evaluatePublicSignupReadiness(countryCode, opts = {}) {
  const now = opts.now || new Date();
  const marketOpen = await isMarketOpenForRegistration(countryCode);
  let lifetimeFreeUntil = DEFAULT_LIFETIME_FREE_UNTIL;
  try {
    lifetimeFreeUntil = await getLifetimeFreeUntil();
  } catch (err) {
    console.error('[market-launch] lifetime_free_until probe failed:', err.message);
  }
  const grandfatherEligible = isFamilyEligibleForGrandfathering({
    countryCode,
    createdAt: now,
    lifetimeFreeUntil,
  });
  const policy = getMarketCommercialPolicy(countryCode);
  let publicBillingUsable = false;
  if (!grandfatherEligible && policy.requiresBillingReady) {
    publicBillingUsable = await isPublicBillingUsable();
  }
  return evaluateSignupCompleteness({
    countryCode,
    marketOpen,
    publicBillingUsable,
    lifetimeFreeUntil,
    now,
  });
}

module.exports = {
  BILLING_NOT_READY_CODE,
  isPublicBillingUsable,
  evaluateSignupCompleteness,
  evaluatePublicSignupReadiness,
};
