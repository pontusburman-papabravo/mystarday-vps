'use strict';

const appSettings = require('../../db/app-settings');
const db = require('./db');
const { isBillingUiEnabled, envBillingUiDisabled } = require('./billing-ui');
const { isIapPaidRolloutReady } = require('./iap-paid-rollout');
const { isMarketPurchaseAllowed } = require('./payment-settings');
const { normalizeCountryCode } = require('./market-region');
const {
  isSandboxPurchasesFlagEnabled,
  normalizeFamilyId,
  isFamilyInStrictSandboxAllowlist,
  getStrictSandboxFamilyAllowlist,
} = require('./iap-sandbox-allowlist');

/**
 * Native StoreKit / Play Billing (via RevenueCat SDK).
 *
 * General (non-sandbox) families: fail closed until global rollout
 * (payment_enabled + billing UI + iap_paid_rollout_ready).
 * Sandbox QA: requires REVENUECAT_SANDBOX_PURCHASES_ENABLED + strict UUID allowlist.
 *
 * @param {string | null | undefined} familyId
 * @param {{ checkGlobalRollout?: boolean }} [opts]
 * @returns {Promise<{ allowed: boolean, reason: string }>}
 */
async function getNativePurchaseEligibility(familyId, opts = {}) {
  const normalized = normalizeFamilyId(familyId);
  if (!normalized) {
    return { allowed: false, reason: 'invalid_or_missing_family_id' };
  }

  const sandboxAllowed = isFamilyInStrictSandboxAllowlist(normalized);
  if (sandboxAllowed) {
    if (!isSandboxPurchasesFlagEnabled()) {
      return { allowed: false, reason: 'sandbox_purchases_disabled' };
    }
    return { allowed: true, reason: 'sandbox_family' };
  }

  if (opts.checkGlobalRollout !== true) {
    return { allowed: false, reason: 'not_sandbox_family' };
  }

  if (envBillingUiDisabled()) {
    return { allowed: false, reason: 'billing_ui_disabled' };
  }
  const billingUi = await isBillingUiEnabled();
  if (!billingUi) {
    return { allowed: false, reason: 'billing_ui_off' };
  }
  const paymentEnabled = await appSettings.getPaymentEnabled();
  if (!paymentEnabled) {
    return { allowed: false, reason: 'payment_disabled' };
  }
  if (!(await isIapPaidRolloutReady())) {
    return { allowed: false, reason: 'paid_rollout_not_ready' };
  }

  let countryCode = 'SE';
  try {
    const { rows } = await db.query(
      'SELECT country_code FROM family WHERE id = $1',
      [normalized]
    );
    countryCode = normalizeCountryCode(rows[0]?.country_code) || 'SE';
  } catch (err) {
    console.error('[iap-native-purchase-gate] family country lookup failed:', err.message);
    return { allowed: false, reason: 'market_purchase_lookup_failed' };
  }

  const marketPurchaseAllowed = await isMarketPurchaseAllowed(countryCode);
  if (!marketPurchaseAllowed) {
    return { allowed: false, reason: 'market_purchase_not_open' };
  }

  return { allowed: true, reason: 'global_rollout' };
}

function getSandboxGateDiagnostics() {
  const { ids, invalidEntries } = getStrictSandboxFamilyAllowlist();
  return {
    sandboxPurchasesFlag: isSandboxPurchasesFlagEnabled(),
    allowlistCount: ids.size,
    invalidAllowlistEntries: invalidEntries.length > 0,
  };
}

module.exports = {
  getNativePurchaseEligibility,
  getSandboxGateDiagnostics,
};
