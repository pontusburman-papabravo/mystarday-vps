'use strict';

const {
  getIapWebhookReadiness,
  getEntitlementId,
  getAllowedProductIds,
  hasAppAllowlistConfigured,
  getPublicSdkKeyForPlatform,
} = require('../../config/revenuecat-iap');
const { ENTITLEMENT_ID, WEBHOOK_PRODUCT_IDS } = require('../../config/iap-product-contract');
const {
  isSandboxPurchasesFlagEnabled,
  getStrictSandboxFamilyAllowlist,
} = require('./iap-sandbox-allowlist');
const { envBillingUiDisabled } = require('./billing-ui');
const { isIapPaidRolloutReady } = require('./iap-paid-rollout');

function envTruthy(name) {
  const v = process.env[name];
  return v === '1' || v === 'true' || v === 'yes';
}

function webhookAuthConfigured() {
  return !!(
    process.env.REVENUECAT_WEBHOOK_SECRET ||
    process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET
  );
}

async function getIapReadinessSnapshot() {
  const webhook = getIapWebhookReadiness();
  const { ids, invalidEntries } = getStrictSandboxFamilyAllowlist();
  const iosKey = !!getPublicSdkKeyForPlatform('ios');
  const androidKey = !!getPublicSdkKeyForPlatform('android');
  const products = getAllowedProductIds();
  const entitlement = getEntitlementId() || ENTITLEMENT_ID;
  const sandboxFlag = isSandboxPurchasesFlagEnabled();
  const sandboxReady = sandboxFlag && ids.size > 0 && invalidEntries.length === 0 && iosKey && androidKey;

  const globalPurchasesRolloutReady = await isIapPaidRolloutReady();

  return {
    iap_webhook_ready: webhook.webhookReady,
    ...(webhook.issues.length ? { iap_config_issues: webhook.issues } : {}),
    iap_readiness: {
      webhook_auth_configured: webhookAuthConfigured(),
      app_allowlist_configured: hasAppAllowlistConfigured(),
      product_allowlist_configured: products.length > 0,
      product_allowlist_matches_contract:
        products.length > 0 &&
        WEBHOOK_PRODUCT_IDS.every((id) => products.includes(id)),
      entitlement_configured: entitlement === ENTITLEMENT_ID,
      ios_public_sdk_configured: iosKey,
      android_public_sdk_configured: androidKey,
      sandbox_purchase_flag_enabled: sandboxFlag,
      sandbox_family_allowlist_configured: ids.size > 0 && invalidEntries.length === 0,
      billing_ui_globally_disabled: envBillingUiDisabled(),
    },
    iap_native_ios_ready: iosKey && sandboxReady,
    iap_native_android_ready: androidKey && sandboxReady,
    iap_sandbox_ready: sandboxReady && webhook.webhookReady,
    iap_paid_rollout_ready: globalPurchasesRolloutReady,
  };
}

module.exports = {
  getIapReadinessSnapshot,
  webhookAuthConfigured,
};
