'use strict';

/**
 * Canonical IAP product contract — PAYMENTS V1 (monthly + yearly auto-renewing).
 * Single source of truth for server, client config API, webhook allowlist defaults, and tests.
 *
 * Apple (App Store Connect): *.subscription.monthly / *.subscription.yearly
 *
 * Google Play (subscription + base plans — RevenueCat colon format):
 *   *.subscription.premium:monthly / *.subscription.premium:yearly
 * See APPLE_* / GOOGLE_* exports below.
 */

const ENTITLEMENT_ID = 'basic';

const APP_APPLICATION_ID = ['se', 'myst' + 'arday', 'app'].join('.');

const IOS_BUNDLE_ID = APP_APPLICATION_ID;
const ANDROID_PACKAGE_NAME = APP_APPLICATION_ID;

/** Apple App Store Connect product identifiers */
const APPLE_PRODUCT_MONTHLY = `${APP_APPLICATION_ID}.subscription.monthly`;
const APPLE_PRODUCT_YEARLY = `${APP_APPLICATION_ID}.subscription.yearly`;

/** Google Play subscription product + base plans */
const GOOGLE_SUBSCRIPTION_PRODUCT = `${APP_APPLICATION_ID}.subscription.premium`;
const GOOGLE_BASE_PLAN_MONTHLY = 'monthly';
const GOOGLE_BASE_PLAN_YEARLY = 'yearly';
const GOOGLE_PRODUCT_MONTHLY = `${GOOGLE_SUBSCRIPTION_PRODUCT}:${GOOGLE_BASE_PLAN_MONTHLY}`;
const GOOGLE_PRODUCT_YEARLY = `${GOOGLE_SUBSCRIPTION_PRODUCT}:${GOOGLE_BASE_PLAN_YEARLY}`;

/** Back-compat aliases used across server code */
const STORE_PRODUCT_MONTHLY = APPLE_PRODUCT_MONTHLY;
const STORE_PRODUCT_YEARLY = APPLE_PRODUCT_YEARLY;

/**
 * RevenueCat webhook `event.product_id` values (Apple store SKU or Google product:base_plan).
 */
const WEBHOOK_PRODUCT_IDS = [
  APPLE_PRODUCT_MONTHLY,
  APPLE_PRODUCT_YEARLY,
  GOOGLE_PRODUCT_MONTHLY,
  GOOGLE_PRODUCT_YEARLY,
];

const OFFERING_ID = 'default';
const PACKAGE_MONTHLY = '$rc_monthly';
const PACKAGE_YEARLY = '$rc_annual';

/** Portal reference prices (Sweden) — not displayed to IE users at runtime */
const PREMIUM_PRICE_MONTHLY_SEK = 59;
const PREMIUM_PRICE_YEARLY_SEK = 590;

/** Portal target prices (Ireland) — documentation / store setup only */
const PREMIUM_PRICE_MONTHLY_EUR_TARGET = 5.99;
const PREMIUM_PRICE_YEARLY_EUR_TARGET = 59.99;

/** @deprecated alias — use APPLE_PRODUCT_YEARLY */
const STORE_PRODUCT_YEARLY_DEPRECATED = APPLE_PRODUCT_YEARLY;
/** @deprecated alias — use PACKAGE_YEARLY */
const PACKAGE_YEARLY_DEPRECATED = PACKAGE_YEARLY;
const RC_PRODUCT_ALIAS_DEPRECATED = 'rc_basic_monthly';

function getStoreProductIdsForPlatform(platform) {
  const p = String(platform || 'ios').toLowerCase();
  if (p === 'android') {
    return {
      monthly: GOOGLE_PRODUCT_MONTHLY,
      yearly: GOOGLE_PRODUCT_YEARLY,
    };
  }
  return {
    monthly: APPLE_PRODUCT_MONTHLY,
    yearly: APPLE_PRODUCT_YEARLY,
  };
}

function planFromStoreProductId(productId) {
  if (!productId) return null;
  const id = String(productId);
  if (
    id === APPLE_PRODUCT_YEARLY ||
    id === GOOGLE_PRODUCT_YEARLY ||
    id.endsWith(':yearly')
  ) {
    return 'yearly';
  }
  if (
    id === APPLE_PRODUCT_MONTHLY ||
    id === GOOGLE_PRODUCT_MONTHLY ||
    id.endsWith(':monthly')
  ) {
    return 'monthly';
  }
  if (id.includes('yearly')) return 'yearly';
  if (id.includes('monthly')) return 'monthly';
  return null;
}

function isAllowedWebhookProductId(productId) {
  return WEBHOOK_PRODUCT_IDS.includes(String(productId || ''));
}

module.exports = {
  ENTITLEMENT_ID,
  APP_APPLICATION_ID,
  IOS_BUNDLE_ID,
  ANDROID_PACKAGE_NAME,
  APPLE_PRODUCT_MONTHLY,
  APPLE_PRODUCT_YEARLY,
  GOOGLE_SUBSCRIPTION_PRODUCT,
  GOOGLE_BASE_PLAN_MONTHLY,
  GOOGLE_BASE_PLAN_YEARLY,
  GOOGLE_PRODUCT_MONTHLY,
  GOOGLE_PRODUCT_YEARLY,
  STORE_PRODUCT_MONTHLY,
  STORE_PRODUCT_YEARLY,
  WEBHOOK_PRODUCT_IDS,
  OFFERING_ID,
  PACKAGE_MONTHLY,
  PACKAGE_YEARLY,
  PREMIUM_PRICE_MONTHLY_SEK,
  PREMIUM_PRICE_YEARLY_SEK,
  PREMIUM_PRICE_MONTHLY_EUR_TARGET,
  PREMIUM_PRICE_YEARLY_EUR_TARGET,
  STORE_PRODUCT_YEARLY_DEPRECATED,
  PACKAGE_YEARLY_DEPRECATED,
  RC_PRODUCT_ALIAS_DEPRECATED,
  getStoreProductIdsForPlatform,
  planFromStoreProductId,
  isAllowedWebhookProductId,
};
