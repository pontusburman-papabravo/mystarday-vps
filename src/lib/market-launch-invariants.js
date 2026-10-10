'use strict';

/**
 * Launch invariants for public signup vs premium vs billing.
 *
 * signup_allowed =
 *   market_open &&
 *   (grandfather_eligible
 *    || !policy.requiresBillingReady
 *    || (publicBillingUsable && marketBillingReady))
 *
 * Sweden intro-year families (created before 2026-10-03 Stockholm) may
 * finish registration without public billing. Swedish signups from that
 * instant, and trial markets, require public billing or they get
 * MARKET_BILLING_NOT_READY — never an account the family cannot use.
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
  isMarketBillingReady,
} = require('./payment-settings');
const {
  isMarketOpenForRegistration,
  marketClosedCode,
  normalizeCountryCode,
} = require('./market-region');
const { getMarketCommercialPolicy, ENTITLEMENT } = require('./market-commercial-policy');
const { signupNow } = require('./signup-clock');
const {
  DEFAULT_IRELAND_FREE_UNTIL,
  getIrelandFreeUntil,
  isIrelandComplimentaryActive,
} = require('./ireland-launch-offer');
const { isLaunchCohortExcludedCountry } = require('./launch-cohort-offer');

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
 *   marketBillingReady?: boolean,
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

  const policy = getMarketCommercialPolicy(countryCode, { createdAt: now });
  if (policy.entitlement === ENTITLEMENT.COMPLIMENTARY_UNTIL) {
    const freeUntil = input.irelandFreeUntil || DEFAULT_IRELAND_FREE_UNTIL;
    if (isIrelandComplimentaryActive({ countryCode, now, freeUntil })) {
      return { allowed: true, reason: 'complimentary_until', code: null };
    }
    const marketBillingReady = input.marketBillingReady === true;
    if (!input.publicBillingUsable || !marketBillingReady) {
      return {
        allowed: false,
        reason: 'billing_not_ready',
        code: BILLING_NOT_READY_CODE,
      };
    }
    return { allowed: true, reason: 'post_complimentary', code: null };
  }
  if (
    input.launchCohortAssignable === true
    && policy.entitlement === ENTITLEMENT.TRIAL
    && !isLaunchCohortExcludedCountry(countryCode)
  ) {
    return { allowed: true, reason: 'launch_cohort_available', code: null };
  }
  if (policy.requiresBillingReady) {
    const marketBillingReady = input.marketBillingReady === true;
    if (!input.publicBillingUsable || !marketBillingReady) {
      return {
        allowed: false,
        reason: 'billing_not_ready',
        code: BILLING_NOT_READY_CODE,
      };
    }
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
  const now = opts.now || signupNow();
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
  const policy = getMarketCommercialPolicy(countryCode, { createdAt: now });
  let irelandFreeUntil = null;
  if (policy.entitlement === ENTITLEMENT.COMPLIMENTARY_UNTIL) {
    try {
      irelandFreeUntil = await getIrelandFreeUntil();
    } catch (err) {
      console.error('[market-launch] market_ie_free_until probe failed:', err.message);
      irelandFreeUntil = new Date(DEFAULT_IRELAND_FREE_UNTIL);
    }
  }
  const complimentaryActive = isIrelandComplimentaryActive({
    countryCode,
    now,
    freeUntil: irelandFreeUntil || DEFAULT_IRELAND_FREE_UNTIL,
  });
  let launchCohortAssignable = false;
  if (
    policy.entitlement === ENTITLEMENT.TRIAL
    && !grandfatherEligible
    && !isLaunchCohortExcludedCountry(countryCode)
  ) {
    try {
      const { isLaunchCohortAssignable } = require('../../db/launch-cohort-offer');
      launchCohortAssignable = await isLaunchCohortAssignable(countryCode);
    } catch (err) {
      console.error('[market-launch] launch cohort probe failed:', err.message);
      launchCohortAssignable = false;
    }
  }
  let publicBillingUsable = false;
  let marketBillingReady = false;
  const billingRequired = !grandfatherEligible && !launchCohortAssignable && (
    policy.requiresBillingReady
    || (policy.entitlement === ENTITLEMENT.COMPLIMENTARY_UNTIL && !complimentaryActive)
  );
  if (billingRequired) {
    publicBillingUsable = await isPublicBillingUsable();
    marketBillingReady = await isMarketBillingReady(countryCode, now);
  }
  const decision = evaluateSignupCompleteness({
    countryCode,
    marketOpen,
    publicBillingUsable,
    marketBillingReady,
    lifetimeFreeUntil,
    irelandFreeUntil,
    launchCohortAssignable,
    now,
  });
  return { ...decision, marketOpen: marketOpen === true };
}

module.exports = {
  BILLING_NOT_READY_CODE,
  isPublicBillingUsable,
  evaluateSignupCompleteness,
  evaluatePublicSignupReadiness,
};
