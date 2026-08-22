'use strict';

const { WEBHOOK_PRODUCT_IDS } = require('../../config/iap-product-contract');

/** Shared RevenueCat test env for webhook integration tests. */
function applyIapWebhookTestEnv() {
  process.env.REVENUECAT_ALLOWED_APP_IDS = 'com.test.app,com.test.app.alt';
  process.env.REVENUECAT_ALLOWED_PRODUCT_IDS = WEBHOOK_PRODUCT_IDS.join(',');
  process.env.REVENUECAT_ENTITLEMENT_ID = 'basic';
}

const TEST_APP_ID = 'com.test.app';

/** After PAYMENTS V1 payment_start_at — avoids lazy grandfather overriding store IAP tests. */
const POST_PAYMENT_START_TEST_CREATED_AT = '2026-11-01T12:00:00+01:00';

module.exports = { applyIapWebhookTestEnv, TEST_APP_ID, POST_PAYMENT_START_TEST_CREATED_AT };
