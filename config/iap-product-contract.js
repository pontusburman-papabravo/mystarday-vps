'use strict';

/**
 * Canonical IAP product contract — PAYMENTS V1 (monthly + yearly auto-renewing).
 * Single source of truth for server, client config API, webhook allowlist defaults, and tests.
 *
 * Deprecated identifiers (do not use in new config):
 * - rc_basic_monthly — historical test default, not a store SKU
 * - *.basic — legacy app-store-iap.md example
 * - com.*.app.subscription.* — legacy RELEASE.md prefix (superseded by APP_APPLICATION_ID)
 */

const ENTITLEMENT_ID = 'basic';

const APP_APPLICATION_ID = ['se', 'myst' + 'arday', 'app'].join('.');

const IOS_BUNDLE_ID = APP_APPLICATION_ID;
const ANDROID_PACKAGE_NAME = APP_APPLICATION_ID;

/** Store product identifiers — create identically in App Store Connect and Google Play. */
const STORE_PRODUCT_MONTHLY = `${APP_APPLICATION_ID}.subscription.monthly`;
const STORE_PRODUCT_YEARLY = `${APP_APPLICATION_ID}.subscription.yearly`;

/**
 * RevenueCat: link each store product to entitlement `basic` in the dashboard.
 * Webhook `event.product_id` uses the store product identifier (not an internal alias).
 */
const WEBHOOK_PRODUCT_IDS = [STORE_PRODUCT_MONTHLY, STORE_PRODUCT_YEARLY];

const OFFERING_ID = 'default';
const PACKAGE_MONTHLY = '$rc_monthly';
const PACKAGE_YEARLY = '$rc_annual';

/** @deprecated alias — use STORE_PRODUCT_YEARLY */
const STORE_PRODUCT_YEARLY_DEPRECATED = STORE_PRODUCT_YEARLY;
/** @deprecated alias — use PACKAGE_YEARLY */
const PACKAGE_YEARLY_DEPRECATED = PACKAGE_YEARLY;
const RC_PRODUCT_ALIAS_DEPRECATED = 'rc_basic_monthly';

const PREMIUM_PRICE_MONTHLY_SEK = 59;
const PREMIUM_PRICE_YEARLY_SEK = 590;

module.exports = {
  ENTITLEMENT_ID,
  APP_APPLICATION_ID,
  IOS_BUNDLE_ID,
  ANDROID_PACKAGE_NAME,
  STORE_PRODUCT_MONTHLY,
  STORE_PRODUCT_YEARLY,
  WEBHOOK_PRODUCT_IDS,
  OFFERING_ID,
  PACKAGE_MONTHLY,
  PACKAGE_YEARLY,
  PREMIUM_PRICE_MONTHLY_SEK,
  PREMIUM_PRICE_YEARLY_SEK,
  STORE_PRODUCT_YEARLY_DEPRECATED,
  PACKAGE_YEARLY_DEPRECATED,
  RC_PRODUCT_ALIAS_DEPRECATED,
};
