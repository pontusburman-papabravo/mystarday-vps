'use strict';

/**
 * Canonical native IAP contract (Apple/Google stores + RevenueCat layer).
 * Store SKU strings must match App Store Connect / Play Console once created.
 *
 * Conflicts to resolve in dashboard setup:
 * - docs/RELEASE.md lists com.*.subscription.* SKUs (legacy redacted prefix)
 * - docs/app-store-iap.md lists *.basic as product id
 * - Webhook/code default RevenueCat product id: rc_basic_monthly
 */

const ENTITLEMENT_ID = 'basic';

const APP_ID = 'se.mystarday.app'; // pragma: allowlist secret
const IOS_BUNDLE_ID = APP_ID;
const ANDROID_PACKAGE_NAME = APP_ID;

/** RevenueCat store product identifier (webhook allowlist default). */
const REVENUECAT_PRODUCT_MONTHLY = 'rc_basic_monthly';

/**
 * App Store / Play subscription product IDs (first release — monthly required).
 * Align with App Store Connect → Subscriptions and Play → Subscriptions.
 */
const STORE_SUBSCRIPTION_MONTHLY = `${APP_ID}.subscription.monthly`; // pragma: allowlist secret

/** Optional in v1 — omit from offering until store products exist. */
const STORE_SUBSCRIPTION_YEARLY = `${APP_ID}.subscription.yearly`; // pragma: allowlist secret

/** RevenueCat dashboard offering identifier. */
const REVENUECAT_OFFERING_ID = 'default';

/** RevenueCat package identifiers inside the offering (dashboard-defined). */
const REVENUECAT_PACKAGE_MONTHLY = '$rc_monthly';
const REVENUECAT_PACKAGE_YEARLY = '$rc_annual';

const YEARLY_IN_FIRST_RELEASE = false;

module.exports = {
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
};
