'use strict';

/**
 * Launch invariants for public signup vs premium vs billing.
 *
 * market open ⇒ signup usable
 * premium required ⇒ billing must be publicly usable (or the family is SE-grandfather eligible)
 * market closed ⇒ public signup cannot enter an unsupported state
 *
 * Does not open markets or enable paid rollout. Fail-closed.
 */

const { isBillingUiEnabled } = require('./billing-ui');
const { getPaymentStartAt, isFamilyEligibleForGrandfathering } = require('./payment-settings');
const {
  isMarketOpenForRegistration,
  marketClosedCode,
  normalizeCountryCode,
} = require('./market-region');

const BILLING_NOT_READY_CODE = 'MARKET_BILLING_NOT_READY';

/**
 * Public (non-sandbox) purchase UI + native IAP eligibility.
 * Same conditions as global rollout in getNativePurchaseEligibility.
 */
async function isPublicBillingUsable() {
  return isBillingUiEnabled();
}

/**
 * Pure decision: given already-read flags, may this country complete public signup?
 * @param {{
 *   countryCode: string,
 *   marketOpen: boolean,
 *   publicBillingUsable: boolean,
 *   paymentStartAt: Date|string,
 *   now?: Date,
 * }} input
 */
function evaluateSignupCompleteness(input) {
  const countryCode = normalizeCountryCode(input.countryCode) || 'SE';
  if (!input.marketOpen) {
    return {
      allowed: false,
      reason: 'market_closed',
      code: marketClosedCode(countryCode),
    };
  }

  const grandfatherEligible = isFamilyEligibleForGrandfathering({
    countryCode,
    createdAt: input.now || new Date(),
    paymentStartAt: input.paymentStartAt,
  });
  if (grandfatherEligible) {
    return { allowed: true, reason: 'grandfather_eligible', code: null };
  }

  if (!input.publicBillingUsable) {
    return {
      allowed: false,
      reason: 'billing_not_usable',
      code: BILLING_NOT_READY_CODE,
    };
  }

  return { allowed: true, reason: 'billing_usable', code: null };
}

/**
 * Server-authoritative public signup gate (market + billing deadlock guard).
 * @param {string} countryCode
 * @param {{ now?: Date }} [opts]
 */
async function evaluatePublicSignupReadiness(countryCode, opts = {}) {
  const [marketOpen, publicBillingUsable, paymentStartAt] = await Promise.all([
    isMarketOpenForRegistration(countryCode),
    isPublicBillingUsable(),
    getPaymentStartAt(),
  ]);
  return evaluateSignupCompleteness({
    countryCode,
    marketOpen,
    publicBillingUsable,
    paymentStartAt,
    now: opts.now,
  });
}

module.exports = {
  BILLING_NOT_READY_CODE,
  isPublicBillingUsable,
  evaluateSignupCompleteness,
  evaluatePublicSignupReadiness,
};
