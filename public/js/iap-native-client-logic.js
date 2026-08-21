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

  function pickPackageFromOffering(offering, packageId, productId) {
    if (!offering || !offering.availablePackages) return null;
    const packages = offering.availablePackages;
    const hasTarget = Boolean(packageId || productId);
    if (packageId) {
      const byPkg = packages.find((p) => p.identifier === packageId);
      if (byPkg) return byPkg;
    }
    if (productId) {
      const target = String(productId);
      const byProduct = packages.find((p) => {
        if (!p.product) return false;
        const identifiers = [
          p.product.identifier,
          p.product.productIdentifier,
        ].filter(Boolean).map(String);
        return identifiers.some((id) => id === target || id.endsWith(`:${target.split(':').pop()}`));
      });
      if (byProduct) return byProduct;
    }
    if (hasTarget) return null;
    return packages[0] || null;
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
    resolveOfferingTierDisplays,
  };
});
