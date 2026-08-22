'use strict';

/**
 * Pure IAP client rules (testable from Node + browser).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IapNativeClientLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function iapNativeClientLogicFactory() {
  const PURCHASE_ERROR = {
    NOT_NATIVE: 'not_native',
    NOT_CONFIGURED: 'not_configured',
    KILL_SWITCH: 'kill_switch',
    NOT_ELIGIBLE: 'not_eligible',
    PURCHASE_IN_FLIGHT: 'purchase_in_flight',
    USER_CANCELLED: 'user_cancelled',
    STORE_ERROR: 'store_error',
    NO_OFFERING: 'no_offering',
    NO_ENTITLEMENT: 'no_entitlement',
  };

  function isNativePlatform(platformIsNative) {
    return platformIsNative === true;
  }

  function shouldInitNativeIap(ctx) {
    if (!isNativePlatform(ctx.isNative)) return false;
    if (!ctx.apiKey) return false;
    if (ctx.killSwitchBillingUi && !ctx.nativePurchasesEnabled) return false;
    if (!ctx.nativePurchasesEnabled) return false;
    return true;
  }

  function canShowNativePurchaseUi(ctx) {
    if (!isNativePlatform(ctx.isNative)) return false;
    if (!ctx.nativePurchasesEnabled) return false;
    if (ctx.killSwitchBillingUi && !ctx.nativePurchasesEnabled) return false;
    return !!(ctx.apiKey && ctx.configReady);
  }

  function canStartPurchase(state) {
    if (state.purchaseInFlight) {
      return { ok: false, code: PURCHASE_ERROR.PURCHASE_IN_FLIGHT };
    }
    if (!state.configReady) {
      return { ok: false, code: PURCHASE_ERROR.NOT_CONFIGURED };
    }
    if (!state.nativePurchasesEnabled) {
      return { ok: false, code: PURCHASE_ERROR.NOT_ELIGIBLE };
    }
    return { ok: true };
  }

  function mapPurchaseError(err) {
    if (!err) return PURCHASE_ERROR.STORE_ERROR;
    const code = err.code || err.errorCode || '';
    const msg = String(err.message || err.userCancelled || '').toLowerCase();
    if (code === '1' || msg.includes('cancel') || err.userCancelled === true) {
      return PURCHASE_ERROR.USER_CANCELLED;
    }
    return PURCHASE_ERROR.STORE_ERROR;
  }

  function hasEntitlement(customerInfo, entitlementId) {
    if (!customerInfo || !entitlementId) return false;
    const active = customerInfo.entitlements && customerInfo.entitlements.active;
    return !!(active && active[entitlementId]);
  }

  function packageProductIdentifiers(product) {
    if (!product) return [];
    return [product.identifier, product.productIdentifier].filter(Boolean).map(String);
  }

  function packageMatchesProduct(product, expectedProductId) {
    if (!expectedProductId) return true;
    const target = String(expectedProductId);
    return packageProductIdentifiers(product).some((id) => id === target);
  }

  function pickPackageFromOffering(offering, packageId, productId) {
    if (!offering || !offering.availablePackages) return null;
    if (!packageId && !productId) return null;

    const match = offering.availablePackages.find((pkg) => {
      if (packageId && pkg.identifier !== packageId) return false;
      if (productId && !packageMatchesProduct(pkg.product, productId)) return false;
      return true;
    });

    return match || null;
  }

  function extractPackageDisplay(pkg) {
    if (!pkg || !pkg.product) return null;
    const product = pkg.product;
    const intro = product.introPrice || product.introductoryPrice || null;
    return {
      identifier: product.identifier || product.productIdentifier || null,
      priceString: product.priceString || null,
      currencyCode: product.currencyCode || null,
      subscriptionPeriod: product.subscriptionPeriod || null,
      introPriceString: intro && intro.priceString ? intro.priceString : null,
      introPeriod: intro && intro.period ? intro.period : null,
    };
  }

  function resolveTrialTermsKey(display, configuredTrialDays) {
    const hasIntroOffer = !!(display && display.introPriceString);
    const hasConfiguredTrial = !!(configuredTrialDays && configuredTrialDays > 0);
    if (hasIntroOffer || hasConfiguredTrial) {
      return 'ConditionalTrial';
    }
    return 'NoTrial';
  }

  function resolveOfferingTierDisplays(offering, configPackages) {
    if (!offering || !configPackages) return null;
    const monthlyPkg = pickPackageFromOffering(
      offering,
      configPackages.monthly && configPackages.monthly.revenueCatPackageId,
      configPackages.monthly && configPackages.monthly.storeProductId
    );
    const yearlyPkg = pickPackageFromOffering(
      offering,
      configPackages.yearly && configPackages.yearly.revenueCatPackageId,
      configPackages.yearly && configPackages.yearly.storeProductId
    );
    const monthly = extractPackageDisplay(monthlyPkg);
    const yearly = extractPackageDisplay(yearlyPkg);
    if (!monthly || !monthly.priceString || !yearly || !yearly.priceString) {
      return null;
    }
    return { monthly, yearly };
  }

  return {
    PURCHASE_ERROR,
    isNativePlatform,
    shouldInitNativeIap,
    canShowNativePurchaseUi,
    canStartPurchase,
    mapPurchaseError,
    hasEntitlement,
    pickPackageFromOffering,
    extractPackageDisplay,
    resolveTrialTermsKey,
    resolveOfferingTierDisplays,
  };
});
