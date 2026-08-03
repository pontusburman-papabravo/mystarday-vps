/**
 * In-App Purchase routes — RevenueCat SDK config.
 * Webhook handler is mounted in app.js before express.json() (see iap-webhook-handler.js).
 */

const express = require('express');
const router = express.Router();
const { requireParent } = require('../middleware/auth');
const {
  getPublicSdkKeyForPlatform,
  getEntitlementId,
} = require('../lib/iap-client-config');
const { getNativePurchaseEligibility } = require('../lib/iap-native-purchase-gate');
const {
  ENTITLEMENT_ID,
  IOS_BUNDLE_ID,
  ANDROID_PACKAGE_NAME,
  STORE_PRODUCT_MONTHLY,
  OFFERING_ID,
  PACKAGE_MONTHLY,
  WEBHOOK_PRODUCT_IDS,
} = require('../../config/iap-product-contract');
const { envBillingUiDisabled } = require('../lib/billing-ui');

router.get('/config', requireParent, async (req, res) => {
  const platform = String(req.query.platform || '').toLowerCase() === 'android' ? 'android' : 'ios';
  const familyId = req.user.familyId || req.user.family_id;
  const eligibility = await getNativePurchaseEligibility(familyId);

  const apiKeyConfigured = !!(getPublicSdkKeyForPlatform(platform));
  const apiKey = eligibility.allowed && apiKeyConfigured
    ? getPublicSdkKeyForPlatform(platform)
    : null;

  const configReady = !!(apiKey && eligibility.allowed);

  res.json({
    apiKey,
    platform,
    productId: STORE_PRODUCT_MONTHLY,
    webhookProductIds: WEBHOOK_PRODUCT_IDS,
    entitlementId: getEntitlementId() || ENTITLEMENT_ID,
    offeringId: OFFERING_ID,
    packages: {
      monthly: {
        revenueCatPackageId: PACKAGE_MONTHLY,
        storeProductId: STORE_PRODUCT_MONTHLY,
      },
    },
    bundleIds: {
      ios: IOS_BUNDLE_ID,
      android: ANDROID_PACKAGE_NAME,
    },
    nativePurchasesEnabled: eligibility.allowed && apiKeyConfigured,
    nativePurchasesReason: eligibility.reason,
    configReady,
    killSwitchBillingUi: envBillingUiDisabled(),
    webPurchaseSupported: false,
  });
});

module.exports = router;
