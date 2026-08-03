'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { getNativePurchaseEligibility } = require('../src/lib/iap-native-purchase-gate');
const {
  isFamilyInStrictSandboxAllowlist,
  getStrictSandboxFamilyAllowlist,
} = require('../src/lib/iap-sandbox-allowlist');

describe('iap native purchase gate', () => {
  const prevIds = process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
  const prevFlag = process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;

  function restore() {
    if (prevIds === undefined) delete process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
    else process.env.REVENUECAT_SANDBOX_FAMILY_IDS = prevIds;
    if (prevFlag === undefined) delete process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;
    else process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = prevFlag;
  }

  test('fail closed without family id', async () => {
    const r = await getNativePurchaseEligibility(null);
    assert.deepEqual(r, { allowed: false, reason: 'invalid_or_missing_family_id' });
    restore();
  });

  test('fail closed for non-sandbox family', async () => {
    process.env.REVENUECAT_SANDBOX_FAMILY_IDS = '11111111-1111-4111-8111-111111111111';
    process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = 'true';
    const r = await getNativePurchaseEligibility('22222222-2222-4222-8222-222222222222');
    assert.deepEqual(r, { allowed: false, reason: 'not_sandbox_family' });
    restore();
  });

  test('sandbox family requires explicit flag', async () => {
    const fid = '33333333-3333-4333-8333-333333333333';
    process.env.REVENUECAT_SANDBOX_FAMILY_IDS = fid;
    delete process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;
    const r = await getNativePurchaseEligibility(fid);
    assert.deepEqual(r, { allowed: false, reason: 'sandbox_purchases_disabled' });
    restore();
  });

  test('allows sandbox family when flag and uuid match', async () => {
    const fid = '33333333-3333-4333-8333-333333333333';
    process.env.REVENUECAT_SANDBOX_FAMILY_IDS = `  ${fid.toUpperCase()} , `;
    process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = 'true';
    const r = await getNativePurchaseEligibility(fid);
    assert.deepEqual(r, { allowed: true, reason: 'sandbox_family' });
    restore();
  });

  test('wildcard is never a valid allowlist member', () => {
    process.env.REVENUECAT_SANDBOX_FAMILY_IDS = '*';
    const { ids, invalidEntries } = getStrictSandboxFamilyAllowlist();
    assert.equal(ids.size, 0);
    assert.ok(invalidEntries.includes('*'));
    assert.equal(isFamilyInStrictSandboxAllowlist('33333333-3333-4333-8333-333333333333'), false);
    restore();
  });
});
