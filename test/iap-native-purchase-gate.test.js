'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { getNativePurchaseEligibility } = require('../src/lib/iap-native-purchase-gate');

describe('iap native purchase gate', () => {
  const prev = process.env.REVENUECAT_SANDBOX_FAMILY_IDS;

  test('fail closed without family id', () => {
    assert.deepEqual(getNativePurchaseEligibility(null), { allowed: false, reason: 'no_family' });
  });

  test('fail closed for non-sandbox family', () => {
    process.env.REVENUECAT_SANDBOX_FAMILY_IDS = '11111111-1111-4111-8111-111111111111';
    assert.deepEqual(
      getNativePurchaseEligibility('22222222-2222-4222-8222-222222222222'),
      { allowed: false, reason: 'not_sandbox_family' }
    );
    if (prev === undefined) delete process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
    else process.env.REVENUECAT_SANDBOX_FAMILY_IDS = prev;
  });

  test('allows sandbox family only', () => {
    const fid = '33333333-3333-4333-8333-333333333333';
    process.env.REVENUECAT_SANDBOX_FAMILY_IDS = fid;
    assert.deepEqual(getNativePurchaseEligibility(fid), { allowed: true, reason: 'sandbox_family' });
    if (prev === undefined) delete process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
    else process.env.REVENUECAT_SANDBOX_FAMILY_IDS = prev;
  });
});
