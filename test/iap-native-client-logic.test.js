'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const Logic = require('../public/js/iap-native-client-logic');
const {
  APPLE_PRODUCT_MONTHLY,
  APPLE_PRODUCT_YEARLY,
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

  test('pickPackageFromOffering returns null when yearly requested but only monthly exists', () => {
    const offering = {
      availablePackages: [
        {
          identifier: '$rc_monthly',
          product: { identifier: GOOGLE_PRODUCT_MONTHLY, priceString: '€5.99' },
        },
      ],
    };
    const yearly = Logic.pickPackageFromOffering(offering, '$rc_annual', GOOGLE_PRODUCT_YEARLY);
    assert.equal(yearly, null);
  });

  test('pickPackageFromOffering returns null when monthly requested but only yearly exists', () => {
    const offering = {
      availablePackages: [
        {
          identifier: '$rc_annual',
          product: { identifier: GOOGLE_PRODUCT_YEARLY, priceString: '€59.99' },
        },
      ],
    };
    const monthly = Logic.pickPackageFromOffering(offering, '$rc_monthly', GOOGLE_PRODUCT_MONTHLY);
    assert.equal(monthly, null);
  });

  test('pickPackageFromOffering returns exact tier when both exist', () => {
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
    const monthly = Logic.pickPackageFromOffering(offering, '$rc_monthly', GOOGLE_PRODUCT_MONTHLY);
    const yearly = Logic.pickPackageFromOffering(offering, '$rc_annual', GOOGLE_PRODUCT_YEARLY);
    assert.equal(monthly.identifier, '$rc_monthly');
    assert.equal(yearly.identifier, '$rc_annual');
  });

  test('resolveOfferingTierDisplays fails closed when yearly tier missing', () => {
    const offering = {
      availablePackages: [
        {
          identifier: '$rc_monthly',
          product: { identifier: GOOGLE_PRODUCT_MONTHLY, priceString: '€5.99' },
        },
      ],
    };
    const displays = Logic.resolveOfferingTierDisplays(offering, {
      monthly: { revenueCatPackageId: '$rc_monthly', storeProductId: GOOGLE_PRODUCT_MONTHLY },
      yearly: { revenueCatPackageId: '$rc_annual', storeProductId: GOOGLE_PRODUCT_YEARLY },
    });
    assert.equal(displays, null);
  });

  test('pickPackageFromOffering returns null when no packageId and no productId', () => {
    const offering = {
      availablePackages: [
        {
          identifier: '$rc_monthly',
          product: { identifier: GOOGLE_PRODUCT_MONTHLY, priceString: '€5.99' },
        },
      ],
    };
    assert.equal(Logic.pickPackageFromOffering(offering, null, null), null);
    assert.equal(Logic.pickPackageFromOffering(offering, undefined, undefined), null);
  });

  test('pickPackageFromOffering never selects unrelated first package in array', () => {
    const offering = {
      availablePackages: [
        {
          identifier: 'other_package',
          product: { identifier: 'some.other.subscription:monthly' },
        },
        {
          identifier: '$rc_monthly',
          product: { identifier: GOOGLE_PRODUCT_MONTHLY },
        },
      ],
    };
    const monthly = Logic.pickPackageFromOffering(offering, '$rc_monthly', GOOGLE_PRODUCT_MONTHLY);
    assert.equal(monthly.identifier, '$rc_monthly');

    const missing = Logic.pickPackageFromOffering(offering, '$rc_annual', GOOGLE_PRODUCT_YEARLY);
    assert.equal(missing, null);
  });

  test('pickPackageFromOffering rejects unrelated Google monthly suffix match', () => {
    const offering = {
      availablePackages: [
        {
          identifier: '$rc_monthly',
          product: { identifier: 'some.other.subscription:monthly' },
        },
      ],
    };
    assert.equal(
      Logic.pickPackageFromOffering(offering, '$rc_monthly', GOOGLE_PRODUCT_MONTHLY),
      null
    );
  });

  test('pickPackageFromOffering rejects unrelated Google yearly suffix match', () => {
    const offering = {
      availablePackages: [
        {
          identifier: '$rc_annual',
          product: { identifier: 'some.other.subscription:yearly' },
        },
      ],
    };
    assert.equal(
      Logic.pickPackageFromOffering(offering, '$rc_annual', GOOGLE_PRODUCT_YEARLY),
      null
    );
  });

  test('pickPackageFromOffering rejects $rc_monthly mapped to canonical yearly product', () => {
    const offering = {
      availablePackages: [
        {
          identifier: '$rc_monthly',
          product: { identifier: GOOGLE_PRODUCT_YEARLY },
        },
      ],
    };
    assert.equal(
      Logic.pickPackageFromOffering(offering, '$rc_monthly', GOOGLE_PRODUCT_MONTHLY),
      null
    );
  });

  test('pickPackageFromOffering rejects $rc_annual mapped to canonical monthly product', () => {
    const offering = {
      availablePackages: [
        {
          identifier: '$rc_annual',
          product: { identifier: GOOGLE_PRODUCT_MONTHLY },
        },
      ],
    };
    assert.equal(
      Logic.pickPackageFromOffering(offering, '$rc_annual', GOOGLE_PRODUCT_YEARLY),
      null
    );
  });

  test('pickPackageFromOffering rejects correct package id with unrelated store product', () => {
    const offering = {
      availablePackages: [
        {
          identifier: '$rc_monthly',
          product: { identifier: 'com.example.unrelated.monthly' },
        },
      ],
    };
    assert.equal(
      Logic.pickPackageFromOffering(offering, '$rc_monthly', GOOGLE_PRODUCT_MONTHLY),
      null
    );
  });

  test('pickPackageFromOffering accepts exact Apple monthly mapping', () => {
    const offering = {
      availablePackages: [
        {
          identifier: '$rc_monthly',
          product: { identifier: APPLE_PRODUCT_MONTHLY },
        },
      ],
    };
    const pkg = Logic.pickPackageFromOffering(offering, '$rc_monthly', APPLE_PRODUCT_MONTHLY);
    assert.equal(pkg.identifier, '$rc_monthly');
    assert.equal(pkg.product.identifier, APPLE_PRODUCT_MONTHLY);
  });

  test('pickPackageFromOffering accepts exact Apple yearly mapping', () => {
    const offering = {
      availablePackages: [
        {
          identifier: '$rc_annual',
          product: { productIdentifier: APPLE_PRODUCT_YEARLY },
        },
      ],
    };
    const pkg = Logic.pickPackageFromOffering(offering, '$rc_annual', APPLE_PRODUCT_YEARLY);
    assert.equal(pkg.identifier, '$rc_annual');
    assert.equal(pkg.product.productIdentifier, APPLE_PRODUCT_YEARLY);
  });

  test('resolveTrialTermsKey uses conditional wording when only trial_days configured', () => {
    assert.equal(Logic.resolveTrialTermsKey({ priceString: '59 kr' }, 14), 'ConditionalTrial');
    assert.equal(Logic.resolveTrialTermsKey({ priceString: '59 kr' }, 14), 'ConditionalTrial');
    assert.notEqual(Logic.resolveTrialTermsKey({ priceString: '59 kr' }, 14), 'KnownTrial');
  });

  test('resolveTrialTermsKey uses known trial when intro price present', () => {
    assert.equal(
      Logic.resolveTrialTermsKey({ priceString: '59 kr', introPriceString: '0 kr' }, 14),
      'KnownTrial'
    );
  });
});
