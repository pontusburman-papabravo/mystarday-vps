'use strict';

/** Shared RevenueCat test env for webhook integration tests. */
function applyIapWebhookTestEnv() {
  process.env.REVENUECAT_ALLOWED_APP_IDS = 'com.test.app,com.test.app.alt';
  process.env.REVENUECAT_ALLOWED_PRODUCT_IDS = 'rc_basic_monthly';
  process.env.REVENUECAT_ENTITLEMENT_ID = 'basic';
}

const TEST_APP_ID = 'com.test.app';

module.exports = { applyIapWebhookTestEnv, TEST_APP_ID };
