'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getIapReadinessSnapshot } = require('../src/lib/iap-readiness');
const { WEBHOOK_PRODUCT_IDS } = require('../config/iap-product-contract');

test('iap readiness snapshot exposes boolean signals only', async () => {
  const snap = await getIapReadinessSnapshot();
  assert.equal(typeof snap.iap_webhook_ready, 'boolean');
  assert.equal(snap.iap_paid_rollout_ready, false);
  assert.equal(typeof snap.iap_readiness.webhook_auth_configured, 'boolean');
  assert.equal(typeof snap.iap_readiness.ios_public_sdk_configured, 'boolean');
  assert.ok(!JSON.stringify(snap).includes('appl_'));
  assert.ok(!JSON.stringify(snap).includes('sk_'));
});

test('default product allowlist uses store SKU from contract', () => {
  const { getAllowedProductIds } = require('../config/revenuecat-iap');
  const prev = process.env.REVENUECAT_ALLOWED_PRODUCT_IDS;
  delete process.env.REVENUECAT_ALLOWED_PRODUCT_IDS;
  assert.deepEqual(getAllowedProductIds(), [...WEBHOOK_PRODUCT_IDS]);
  if (prev === undefined) delete process.env.REVENUECAT_ALLOWED_PRODUCT_IDS;
  else process.env.REVENUECAT_ALLOWED_PRODUCT_IDS = prev;
});
