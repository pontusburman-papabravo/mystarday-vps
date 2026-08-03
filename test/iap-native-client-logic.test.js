'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const Logic = require('../public/js/iap-native-client-logic');

describe('iap native client logic', () => {
  test('web does not init native iap', () => {
    assert.equal(Logic.shouldInitNativeIap({ isNative: false, apiKey: 'appl_x', nativePurchasesEnabled: true }), false);
  });

  test('missing sdk key fail closed', () => {
    assert.equal(
      Logic.shouldInitNativeIap({ isNative: true, apiKey: null, nativePurchasesEnabled: true }),
      false
    );
  });

  test('sandbox flag required for init', () => {
    assert.equal(
      Logic.shouldInitNativeIap({ isNative: true, apiKey: 'appl_x', nativePurchasesEnabled: false }),
      false
    );
  });

  test('blocks duplicate purchase', () => {
    const blocked = Logic.canStartPurchase({
      purchaseInFlight: true,
      configReady: true,
      nativePurchasesEnabled: true,
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.code, Logic.PURCHASE_ERROR.PURCHASE_IN_FLIGHT);
  });

  test('user cancel mapping', () => {
    assert.equal(Logic.mapPurchaseError({ userCancelled: true }), Logic.PURCHASE_ERROR.USER_CANCELLED);
  });

  test('entitlement check', () => {
    const info = { entitlements: { active: { basic: { identifier: 'basic' } } } };
    assert.equal(Logic.hasEntitlement(info, 'basic'), true);
    assert.equal(Logic.hasEntitlement(info, 'other'), false);
  });

  test('pick package by identifier', () => {
    const offering = {
      availablePackages: [
        { identifier: '$rc_monthly', product: { identifier: 'rc_basic_monthly' } },
      ],
    };
    const pkg = Logic.pickPackageFromOffering(offering, '$rc_monthly', null);
    assert.equal(pkg.identifier, '$rc_monthly');
  });
});
