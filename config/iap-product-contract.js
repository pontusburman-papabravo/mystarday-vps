'use strict';

/**
 * Canonical IAP product contract — first release (monthly auto-renewing only).
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

/** Store product identifier — create identically in App Store Connect and Google Play. */
const STORE_PRODUCT_MONTHLY = `${APP_APPLICATION_ID}.subscription.monthly`;

/**
 * RevenueCat: link each store product to entitlement `basic` in the dashboard.
 * Webhook `event.product_id` uses the store product identifier (not an internal alias).
 */
const WEBHOOK_PRODUCT_IDS = [STORE_PRODUCT_MONTHLY];

const OFFERING_ID = 'default';
const PACKAGE_MONTHLY = '$rc_monthly';

/** Yearly / $rc_annual — not in first release (reserved for later). */
const STORE_PRODUCT_YEARLY_DEPRECATED = `${APP_APPLICATION_ID}.subscription.yearly`;
const PACKAGE_YEARLY_DEPRECATED = '$rc_annual';
const RC_PRODUCT_ALIAS_DEPRECATED = 'rc_basic_monthly';

module.exports = {
  ENTITLEMENT_ID,
  APP_APPLICATION_ID,
  IOS_BUNDLE_ID,
  ANDROID_PACKAGE_NAME,
  STORE_PRODUCT_MONTHLY,
  WEBHOOK_PRODUCT_IDS,
  OFFERING_ID,
  PACKAGE_MONTHLY,
  STORE_PRODUCT_YEARLY_DEPRECATED,
  PACKAGE_YEARLY_DEPRECATED,
  RC_PRODUCT_ALIAS_DEPRECATED,
};
