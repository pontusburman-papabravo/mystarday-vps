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
  STORE_PRODUCT_YEARLY,
  OFFERING_ID,
  PACKAGE_MONTHLY,
  PACKAGE_YEARLY,
  WEBHOOK_PRODUCT_IDS,
  PREMIUM_PRICE_MONTHLY_SEK,
  PREMIUM_PRICE_YEARLY_SEK,
} = require('../../config/iap-product-contract');
const { envBillingUiDisabled } = require('../lib/billing-ui');
const { resolveFamilyEntitlements, applyStoreEntitlementFromWebhook } = require('../lib/family-entitlements');

router.get('/config', requireParent, async (req, res) => {
  const platform = String(req.query.platform || '').toLowerCase() === 'android' ? 'android' : 'ios';
  const familyId = req.user.familyId || req.user.family_id;
  const eligibility = await getNativePurchaseEligibility(familyId, { checkGlobalRollout: true });

  const apiKeyConfigured = !!(getPublicSdkKeyForPlatform(platform));
  const apiKey = eligibility.allowed && apiKeyConfigured
    ? getPublicSdkKeyForPlatform(platform)
    : null;

  const configReady = !!(apiKey && eligibility.allowed);

  res.json({
    apiKey,
    platform,
    productId: STORE_PRODUCT_MONTHLY,
    products: {
      monthly: STORE_PRODUCT_MONTHLY,
      yearly: STORE_PRODUCT_YEARLY,
    },
    webhookProductIds: WEBHOOK_PRODUCT_IDS,
    entitlementId: getEntitlementId() || ENTITLEMENT_ID,
    offeringId: OFFERING_ID,
    packages: {
      monthly: {
        revenueCatPackageId: PACKAGE_MONTHLY,
        storeProductId: STORE_PRODUCT_MONTHLY,
        price_sek: PREMIUM_PRICE_MONTHLY_SEK,
        trial_days: 14,
      },
      yearly: {
        revenueCatPackageId: PACKAGE_YEARLY,
        storeProductId: STORE_PRODUCT_YEARLY,
        price_sek: PREMIUM_PRICE_YEARLY_SEK,
        trial_days: 14,
        recommended: true,
        savings_sek: (PREMIUM_PRICE_MONTHLY_SEK * 12) - PREMIUM_PRICE_YEARLY_SEK,
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

router.post('/sync', requireParent, async (req, res) => {
  try {
    const familyId = req.user.familyId || req.user.family_id;
    const {
      productId,
      expirationAtMs,
      periodType,
      store,
      environment,
    } = req.body || {};

    const subscriptionStatus = expirationAtMs && Number(expirationAtMs) > Date.now()
      ? (String(periodType || '').toUpperCase() === 'TRIAL' ? 'active' : 'active')
      : 'expired';

    const eventType = 'SYNC';
    await applyStoreEntitlementFromWebhook(familyId, {
      subscriptionStatus: subscriptionStatus === 'active' && String(periodType || '').toUpperCase() === 'TRIAL'
        ? 'active'
        : subscriptionStatus,
      eventType,
      event: {
        id: `sync_${Date.now()}`,
        store: store || null,
        environment: environment || null,
        period_type: periodType || null,
      },
      productId: productId || STORE_PRODUCT_MONTHLY,
      expirationAtMs: expirationAtMs || null,
    });

    const resolved = await resolveFamilyEntitlements(familyId);
    res.json({ ok: true, ...resolved });
  } catch (err) {
    console.error('[IAP] sync error:', err.message);
    res.status(500).json({ error: 'Kunde inte synka prenumeration' });
  }
});

module.exports = router;
