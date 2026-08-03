/**
 * In-App Purchase routes — RevenueCat SDK config.
 * Webhook handler is mounted in app.js before express.json() (see iap-webhook-handler.js).
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireParent } = require('../middleware/auth');
const {
  getPublicSdkKeyForPlatform,
  getLegacyPublicApiKey,
  getEntitlementId,
  DEFAULT_PRODUCT_ID,
} = require('../lib/iap-client-config');
const { getNativePurchaseEligibility } = require('../lib/iap-native-purchase-gate');
const {
  ENTITLEMENT_ID,
  IOS_BUNDLE_ID,
  ANDROID_PACKAGE_NAME,
  REVENUECAT_PRODUCT_MONTHLY,
  STORE_SUBSCRIPTION_MONTHLY,
  STORE_SUBSCRIPTION_YEARLY,
  REVENUECAT_OFFERING_ID,
  REVENUECAT_PACKAGE_MONTHLY,
  REVENUECAT_PACKAGE_YEARLY,
  YEARLY_IN_FIRST_RELEASE,
} = require('../../config/iap-native-contract');
const { envBillingUiDisabled } = require('../lib/billing-ui');

router.get('/config', requireParent, (req, res) => {
  const platform = String(req.query.platform || '').toLowerCase() === 'android' ? 'android' : 'ios';
  const apiKey = getPublicSdkKeyForPlatform(platform) || getLegacyPublicApiKey();
  const familyId = req.user.familyId || req.user.family_id;
  const eligibility = getNativePurchaseEligibility(familyId);

  const configReady = !!(apiKey && eligibility.allowed);

  res.json({
    apiKey: apiKey || null,
    platform,
    productId: process.env.REVENUECAT_DEFAULT_PRODUCT_ID || DEFAULT_PRODUCT_ID,
    entitlementId: getEntitlementId() || ENTITLEMENT_ID,
    offeringId: REVENUECAT_OFFERING_ID,
    packages: {
      monthly: {
        revenueCatPackageId: REVENUECAT_PACKAGE_MONTHLY,
        revenueCatProductId: REVENUECAT_PRODUCT_MONTHLY,
        storeProductId: STORE_SUBSCRIPTION_MONTHLY,
      },
      ...(YEARLY_IN_FIRST_RELEASE
        ? {
            yearly: {
              revenueCatPackageId: REVENUECAT_PACKAGE_YEARLY,
              revenueCatProductId: null,
              storeProductId: STORE_SUBSCRIPTION_YEARLY,
            },
          }
        : {}),
    },
    bundleIds: {
      ios: IOS_BUNDLE_ID,
      android: ANDROID_PACKAGE_NAME,
    },
    nativePurchasesEnabled: eligibility.allowed && !!apiKey,
    nativePurchasesReason: eligibility.reason,
    configReady,
    killSwitchBillingUi: envBillingUiDisabled(),
    webPurchaseSupported: false,
  });
});

module.exports = router;
