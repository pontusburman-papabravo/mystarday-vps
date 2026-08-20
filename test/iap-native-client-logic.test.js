'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const Logic = require('../public/js/iap-native-client-logic');
const {
  GOOGLE_PRODUCT_MONTHLY,
  GOOGLE_PRODUCT_YEARLY,
} = require('../config/iap-product-contract');

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

  test('pick package by Google base-plan product id', () => {
    const offering = {
      availablePackages: [
        {
          identifier: '$rc_monthly',
          product: { identifier: GOOGLE_PRODUCT_MONTHLY, priceString: '€5.99' },
        },
      ],
    };
    const pkg = Logic.pickPackageFromOffering(
      offering,
      '$rc_monthly',
      GOOGLE_PRODUCT_MONTHLY
    );
    assert.equal(pkg.product.priceString, '€5.99');
  });

  test('resolveOfferingTierDisplays requires localized prices', () => {
    const offering = {
      availablePackages: [
        {
          identifier: '$rc_monthly',
          product: { identifier: GOOGLE_PRODUCT_MONTHLY, priceString: '€5.99' },
        },
        {
          identifier: '$rc_annual',
          product: { identifier: GOOGLE_PRODUCT_YEARLY, priceString: '€59.99' },
        },
      ],
    };
    const displays = Logic.resolveOfferingTierDisplays(offering, {
      monthly: { revenueCatPackageId: '$rc_monthly', storeProductId: GOOGLE_PRODUCT_MONTHLY },
      yearly: { revenueCatPackageId: '$rc_annual', storeProductId: GOOGLE_PRODUCT_YEARLY },
    });
    assert.equal(displays.monthly.priceString, '€5.99');
    assert.equal(displays.yearly.priceString, '€59.99');
  });
});
