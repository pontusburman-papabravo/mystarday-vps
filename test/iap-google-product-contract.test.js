'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  APP_APPLICATION_ID,
  APPLE_PRODUCT_MONTHLY,
  APPLE_PRODUCT_YEARLY,
  GOOGLE_SUBSCRIPTION_PRODUCT,
  GOOGLE_PRODUCT_MONTHLY,
  GOOGLE_PRODUCT_YEARLY,
  WEBHOOK_PRODUCT_IDS,
  getStoreProductIdsForPlatform,
  planFromStoreProductId,
  isAllowedWebhookProductId,
} = require('../config/iap-product-contract');
const { getAllowedProductIds, isAllowedProductId } = require('../config/revenuecat-iap');

describe('iap product contract', () => {
  it('Apple product IDs unchanged', () => {
    assert.equal(APPLE_PRODUCT_MONTHLY, `${APP_APPLICATION_ID}.subscription.monthly`);
    assert.equal(APPLE_PRODUCT_YEARLY, `${APP_APPLICATION_ID}.subscription.yearly.v2`);
  });

  it('Google uses subscription:base_plan RevenueCat identifiers', () => {
    assert.equal(GOOGLE_PRODUCT_MONTHLY, `${APP_APPLICATION_ID}.subscription.premium:monthly`);
    assert.equal(GOOGLE_PRODUCT_YEARLY, `${APP_APPLICATION_ID}.subscription.premium:yearly`);
  });

  it('webhook allowlist includes Apple + Google identifiers', () => {
    assert.deepEqual(WEBHOOK_PRODUCT_IDS, [
      APPLE_PRODUCT_MONTHLY,
      APPLE_PRODUCT_YEARLY,
      GOOGLE_PRODUCT_MONTHLY,
      GOOGLE_PRODUCT_YEARLY,
    ]);
    assert.equal(getAllowedProductIds().length, 4);
  });

  it('platform config returns correct store product IDs', () => {
    assert.deepEqual(getStoreProductIdsForPlatform('ios'), {
      monthly: APPLE_PRODUCT_MONTHLY,
      yearly: APPLE_PRODUCT_YEARLY,
    });
    assert.deepEqual(getStoreProductIdsForPlatform('android'), {
      monthly: GOOGLE_PRODUCT_MONTHLY,
      yearly: GOOGLE_PRODUCT_YEARLY,
    });
  });

  it('plan mapping works for Apple and Google webhook product IDs', () => {
    assert.equal(planFromStoreProductId(APPLE_PRODUCT_MONTHLY), 'monthly');
    assert.equal(planFromStoreProductId(GOOGLE_PRODUCT_MONTHLY), 'monthly');
    assert.equal(planFromStoreProductId(GOOGLE_PRODUCT_YEARLY), 'yearly');
  });

  it('unknown product fails closed', () => {
    assert.equal(isAllowedWebhookProductId('com.example.unknown'), false);
    assert.equal(planFromStoreProductId('com.example.unknown'), null);
  });

  it('accepts Google subscription product id without base plan suffix for allowlist only', () => {
    assert.equal(isAllowedWebhookProductId(GOOGLE_SUBSCRIPTION_PRODUCT), true);
    assert.equal(isAllowedProductId(GOOGLE_SUBSCRIPTION_PRODUCT), true);
    assert.equal(isAllowedWebhookProductId(GOOGLE_PRODUCT_MONTHLY), true);
    assert.equal(isAllowedProductId(GOOGLE_PRODUCT_YEARLY), true);
    assert.equal(isAllowedWebhookProductId('com.example.unknown:monthly'), false);
  });

  it('Google plan mapping: monthly/yearly suffix only, never base product alone', () => {
    assert.equal(planFromStoreProductId(GOOGLE_PRODUCT_MONTHLY), 'monthly');
    assert.equal(planFromStoreProductId(GOOGLE_PRODUCT_YEARLY), 'yearly');
    assert.equal(planFromStoreProductId(GOOGLE_SUBSCRIPTION_PRODUCT), null);
    assert.equal(isAllowedWebhookProductId('com.example.unknown'), false);
    assert.equal(isAllowedProductId('com.example.unknown'), false);
  });
});
