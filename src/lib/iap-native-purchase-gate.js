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
 * @param {string} normalizedFamilyId
 * @returns {Promise<string>}
 */
async function lookupFamilyCountryCode(normalizedFamilyId) {
  const { rows } = await db.query(
    'SELECT country_code FROM family WHERE id = $1',
    [normalizedFamilyId]
  );
  return normalizeCountryCode(rows[0]?.country_code) || 'SE';
}

/**
 * Sandbox QA or global billing infrastructure (no market commercial gate).
 *
 * @param {string} normalizedFamilyId
 * @param {{ checkGlobalRollout?: boolean }} opts
 * @returns {Promise<{ allowed: boolean, reason: string }>}
 */
async function evaluateGlobalBillingInfrastructureEligibility(normalizedFamilyId, opts = {}) {
  const sandboxAllowed = isFamilyInStrictSandboxAllowlist(normalizedFamilyId);
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

  return { allowed: true, reason: 'global_infrastructure_ready' };
}

/**
 * Native restore — global infrastructure only. Not gated by market acquisition pause.
 *
 * @param {string | null | undefined} familyId
 * @param {{ checkGlobalRollout?: boolean }} [opts]
 * @returns {Promise<{ allowed: boolean, reason: string }>}
 */
async function getNativeRestoreEligibility(familyId, opts = {}) {
  const normalized = normalizeFamilyId(familyId);
  if (!normalized) {
    return { allowed: false, reason: 'invalid_or_missing_family_id' };
  }
  return evaluateGlobalBillingInfrastructureEligibility(normalized, opts);
}

/**
 * Native StoreKit / Play Billing new purchase (via RevenueCat SDK).
 *
 * General families: global infrastructure + market commercial purchase permission.
 * Sandbox QA: REVENUECAT_SANDBOX_PURCHASES_ENABLED + strict UUID allowlist.
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

  const infrastructure = await evaluateGlobalBillingInfrastructureEligibility(normalized, opts);
  if (!infrastructure.allowed) {
    return infrastructure;
  }

  if (infrastructure.reason === 'sandbox_family') {
    return infrastructure;
  }

  let countryCode = 'SE';
  try {
    countryCode = await lookupFamilyCountryCode(normalized);
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
  getNativeRestoreEligibility,
  getSandboxGateDiagnostics,
};
