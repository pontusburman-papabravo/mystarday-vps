/**
 * iap-manager.js — Native StoreKit / Play Billing via RevenueCat (sandbox QA only).
 *
 * Web/PWA: no RevenueCat, no purchase UI (fail closed).
 * Native: init + purchase when GET /api/iap/config returns nativePurchasesEnabled.
 */

(function () {
  'use strict';

  const Logic = typeof IapNativeClientLogic !== 'undefined' ? IapNativeClientLogic : null;

  let _initialized = false;
  let _initPromise = null;
  let _config = null;
  let _purchaseInFlight = false;
  let _cachedEntitlementActive = null;
  let _lastRcFamilyId = null;
  let _configureDone = false;
  let _isNative = null;

  function isNative() {
    if (_isNative !== null) return _isNative;
    _isNative = typeof window !== 'undefined' &&
      typeof window.Platform !== 'undefined' &&
      typeof window.Platform.isNative === 'function' &&
      window.Platform.isNative();
    return _isNative;
  }

  function platformName() {
    if (typeof window !== 'undefined' && window.Platform && typeof window.Platform.getPlatform === 'function') {
      const p = window.Platform.getPlatform();
      if (p === 'android') return 'android';
    }
    return 'ios';
  }

  async function fetchConfig() {
    const platform = platformName();
    const res = await fetch('/api/iap/config?platform=' + encodeURIComponent(platform), {
      credentials: 'include',
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  }

  function getPurchasesPlugin() {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (!cap || !cap.Plugins || !cap.Plugins.Purchases) {
      return null;
    }
    return cap.Plugins.Purchases;
  }

  function getFamilyId() {
    if (typeof window !== 'undefined' && window.Auth && typeof window.Auth.getFamilyId === 'function') {
      return window.Auth.getFamilyId();
    }
    return null;
  }

  function logicCtx() {
    return {
      isNative: isNative(),
      apiKey: _config && _config.apiKey,
      nativePurchasesEnabled: _config && _config.nativePurchasesEnabled === true,
      killSwitchBillingUi: _config && _config.killSwitchBillingUi === true,
      configReady: _config && _config.configReady === true,
    };
  }

  async function loginRevenueCat(familyId) {
    if (!familyId) return;
    const normalized = String(familyId).toLowerCase();
    try {
      const purchases = getPurchasesPlugin();
      if (!purchases) return;
      if (_lastRcFamilyId && _lastRcFamilyId !== normalized) {
        await purchases.logOut();
        _configureDone = false;
      }
      await purchases.logIn({ appUserID: normalized });
      _lastRcFamilyId = normalized;
    } catch (err) {
      console.warn('[IAPManager] logIn failed (non-fatal):', err && err.message ? err.message : 'unknown');
    }
  }

  async function logoutRevenueCat() {
    try {
      const purchases = getPurchasesPlugin();
      if (!purchases) return;
      await purchases.logOut();
    } catch (err) {
      console.warn('[IAPManager] logOut failed (non-fatal):', err && err.message ? err.message : 'unknown');
    }
    _cachedEntitlementActive = null;
    _config = null;
    _initialized = false;
    _initPromise = null;
    _lastRcFamilyId = null;
    _configureDone = false;
  }

  async function init() {
    if (_initPromise) return _initPromise;

    if (!isNative()) {
      _initialized = true;
      _initPromise = Promise.resolve();
      return _initPromise;
    }

    _initPromise = (async function () {
      try {
        _config = await fetchConfig();
        if (!Logic || !Logic.shouldInitNativeIap(logicCtx())) {
          _initialized = true;
          return;
        }

        const purchases = getPurchasesPlugin();
        if (!purchases) {
          _initialized = true;
          return;
        }
        if (!_configureDone) {
          await purchases.configure({ apiKey: _config.apiKey });
          _configureDone = true;
        }

        const familyId = getFamilyId();
        if (familyId) {
          await loginRevenueCat(familyId);
        }

        _initialized = true;
        await refreshEntitlementCache();
      } catch (err) {
        console.error('[IAPManager] init failed:', err && err.message ? err.message : 'unknown');
        _initialized = true;
      }
    })();

    return _initPromise;
  }

  async function refreshEntitlementCache() {
    if (!isNative() || !_config || !_config.configReady) {
      _cachedEntitlementActive = null;
      return false;
    }
    try {
      const purchases = getPurchasesPlugin();
      if (!purchases) return null;
      const info = await purchases.getCustomerInfo();
      const ent = _config.entitlementId || 'basic';
      _cachedEntitlementActive = Logic ? Logic.hasEntitlement(info.customerInfo || info, ent) : false;
      return _cachedEntitlementActive;
    } catch (err) {
      console.warn('[IAPManager] getCustomerInfo failed:', err && err.message ? err.message : 'unknown');
      return null;
    }
  }

  async function checkSubscriptionStatus(familyInfo) {
    if (!isNative()) return true;

    if (familyInfo && familyInfo.is_lifetime_free === true) return true;
    try {
      const user = window.Auth && window.Auth.getUser ? window.Auth.getUser() : null;
      if (user && user.is_lifetime_free === true) return true;
    } catch (_) {}

    if (!_initialized) await init();
    if (!_config || !_config.configReady) {
      return true;
    }

    const active = await refreshEntitlementCache();
    if (active === null) return true;
    return active === true;
  }

  function canShowPaymentUI() {
    if (!isNative()) return false;
    if (!Logic) return false;
    return Logic.canShowNativePurchaseUi(logicCtx());
  }

  function canPurchase() {
    if (!Logic) return false;
    const ctx = logicCtx();
    return Logic.canShowNativePurchaseUi(ctx) && _initialized;
  }

  async function getCurrentOffering() {
    if (!_initialized) await init();
    if (!canPurchase()) return null;
    const purchases = getPurchasesPlugin();
    if (!purchases) return null;
    const offerings = await purchases.getOfferings();
    const offeringId = (_config && _config.offeringId) || 'default';
    return (offerings && offerings.current) ||
      (offerings && offerings.all && offerings.all[offeringId]) ||
      null;
  }

  async function syncBackendEntitlement() {
    if (typeof fetch !== 'function') return;
    await fetch('/api/iap/sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(function () {});
  }

  async function purchaseMonthly() {
    return purchasePackage('monthly');
  }

  async function purchasePackage(tier) {
    if (!Logic) {
      return { ok: false, code: 'not_configured' };
    }
    const gate = Logic.canStartPurchase({
      purchaseInFlight: _purchaseInFlight,
      configReady: _config && _config.configReady,
      nativePurchasesEnabled: _config && _config.nativePurchasesEnabled,
    });
    if (!gate.ok) {
      return { ok: false, code: gate.code };
    }

    _purchaseInFlight = true;
    try {
      const offering = await getCurrentOffering();
      if (!offering) {
        return { ok: false, code: Logic.PURCHASE_ERROR.NO_OFFERING };
      }
      const pkgMeta = _config.packages && _config.packages[tier];
      if (!pkgMeta) {
        return { ok: false, code: Logic.PURCHASE_ERROR.NO_OFFERING };
      }
      const pkg = Logic.pickPackageFromOffering(
        offering,
        pkgMeta.revenueCatPackageId,
        pkgMeta.storeProductId
      );
      if (!pkg) {
        return { ok: false, code: Logic.PURCHASE_ERROR.NO_OFFERING };
      }

      const purchases = getPurchasesPlugin();
      if (!purchases) {
        return { ok: false, code: Logic.PURCHASE_ERROR.NOT_CONFIGURED };
      }
      const result = await purchases.purchasePackage({ aPackage: pkg });
      const ent = _config.entitlementId || 'basic';
      const has = Logic.hasEntitlement(result.customerInfo, ent);
      _cachedEntitlementActive = has;
      await syncBackendEntitlement(result.customerInfo);
      if (!has) {
        return { ok: false, code: Logic.PURCHASE_ERROR.NO_ENTITLEMENT };
      }
      return { ok: true, customerInfo: result.customerInfo };
    } catch (err) {
      return { ok: false, code: Logic.mapPurchaseError(err) };
    } finally {
      _purchaseInFlight = false;
    }
  }

  async function restorePurchases() {
    if (!canPurchase()) {
      return { ok: false, code: Logic ? Logic.PURCHASE_ERROR.NOT_ELIGIBLE : 'not_eligible' };
    }
    if (_purchaseInFlight) {
      return { ok: false, code: Logic.PURCHASE_ERROR.PURCHASE_IN_FLIGHT };
    }
    _purchaseInFlight = true;
    try {
      const purchases = getPurchasesPlugin();
      if (!purchases) {
        return { ok: false, code: Logic.PURCHASE_ERROR.NOT_CONFIGURED };
      }
      const result = await purchases.restorePurchases();
      const ent = _config.entitlementId || 'basic';
      const has = Logic.hasEntitlement(result.customerInfo, ent);
      _cachedEntitlementActive = has;
      await syncBackendEntitlement(result.customerInfo);
      return { ok: true, active: has };
    } catch (err) {
      return { ok: false, code: Logic.mapPurchaseError(err) };
    } finally {
      _purchaseInFlight = false;
    }
  }

  async function onAuthLogin(detail) {
    if (!isNative()) return;
    const familyId = (detail && detail.familyId) || getFamilyId();
    if (!familyId) return;
    _config = await fetchConfig();
    if (!_config || !_config.nativePurchasesEnabled) {
      await logoutRevenueCat();
      return;
    }
    _initPromise = null;
    _initialized = false;
    await init();
    if (_config && _config.configReady) {
      await loginRevenueCat(familyId);
      await refreshEntitlementCache();
    }
  }

  async function onAppResume() {
    if (!isNative() || !_config || !_config.configReady) return;
    await refreshEntitlementCache();
  }

  function wireLifecycle() {
    if (typeof document === 'undefined') return;
    document.addEventListener('stjarndag:auth-login', function (ev) {
      onAuthLogin(ev && ev.detail).catch(function () {});
    });
    document.addEventListener('stjarndag:auth-logout', function () {
      logoutRevenueCat().catch(function () {});
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        onAppResume().catch(function () {});
      }
    });
  }

  async function autoInit() {
    wireLifecycle();
    if (isNative()) {
      await init();
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        autoInit().catch(function () {});
      });
    } else {
      autoInit().catch(function () {});
    }
  }

  window.IAPManager = {
    init: init,
    checkSubscriptionStatus: checkSubscriptionStatus,
    canShowPaymentUI: canShowPaymentUI,
    canPurchase: canPurchase,
    getCurrentOffering: getCurrentOffering,
    purchaseMonthly: purchaseMonthly,
    purchaseYearly: function () { return purchasePackage('yearly'); },
    purchasePackage: purchasePackage,
    restorePurchases: restorePurchases,
    refreshEntitlementCache: refreshEntitlementCache,
    isNative: isNative,
  };
})();
