/**
 * iap-manager.js — Native StoreKit / Play Billing via RevenueCat (sandbox QA only).
 *
 * Web/PWA: no RevenueCat, no purchase UI (fail closed).
 * Native: init + purchase when GET /api/iap/config returns nativePurchasesEnabled.
 */

(function () {
  'use strict';

  var Logic = typeof IapNativeClientLogic !== 'undefined' ? IapNativeClientLogic : null;

  var _initialized = false;
  var _initPromise = null;
  var _config = null;
  var _purchaseInFlight = false;
  var _cachedEntitlementActive = null;
  var _lastRcFamilyId = null;
  var _configureDone = false;

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
      var p = window.Platform.getPlatform();
      if (p === 'android') return 'android';
    }
    return 'ios';
  }

  async function fetchConfig() {
    var platform = platformName();
    var res = await fetch('/api/iap/config?platform=' + encodeURIComponent(platform), {
      credentials: 'include',
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  }

  function getPurchasesPlugin() {
    var cap = typeof window !== 'undefined' ? window.Capacitor : null;
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
    var normalized = String(familyId).toLowerCase();
    try {
      var purchases = getPurchasesPlugin();
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
      var purchases = getPurchasesPlugin();
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

        var purchases = getPurchasesPlugin();
        if (!purchases) {
          _initialized = true;
          return;
        }
        if (!_configureDone) {
          await purchases.configure({ apiKey: _config.apiKey });
          _configureDone = true;
        }

        var familyId = getFamilyId();
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
      var purchases = getPurchasesPlugin();
      if (!purchases) return null;
      var info = await purchases.getCustomerInfo();
      var ent = _config.entitlementId || 'basic';
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
      var user = window.Auth && window.Auth.getUser ? window.Auth.getUser() : null;
      if (user && user.is_lifetime_free === true) return true;
    } catch (_) {}

    if (!_initialized) await init();
    if (!_config || !_config.configReady) {
      return true;
    }

    var active = await refreshEntitlementCache();
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
    var ctx = logicCtx();
    return Logic.canShowNativePurchaseUi(ctx) && _initialized;
  }

  async function getCurrentOffering() {
    if (!_initialized) await init();
    if (!canPurchase()) return null;
    var purchases = getPurchasesPlugin();
    if (!purchases) return null;
    var offerings = await purchases.getOfferings();
    var offeringId = (_config && _config.offeringId) || 'default';
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
    var gate = Logic.canStartPurchase({
      purchaseInFlight: _purchaseInFlight,
      configReady: _config && _config.configReady,
      nativePurchasesEnabled: _config && _config.nativePurchasesEnabled,
    });
    if (!gate.ok) {
      return { ok: false, code: gate.code };
    }

    _purchaseInFlight = true;
    try {
      var offering = await getCurrentOffering();
      if (!offering) {
        return { ok: false, code: Logic.PURCHASE_ERROR.NO_OFFERING };
      }
      var pkgMeta = (_config.packages && _config.packages[tier]) || _config.packages.monthly;
      var pkg = Logic.pickPackageFromOffering(
        offering,
        pkgMeta && pkgMeta.revenueCatPackageId,
        pkgMeta && pkgMeta.storeProductId
      );
      if (!pkg) {
        return { ok: false, code: Logic.PURCHASE_ERROR.NO_OFFERING };
      }

      var purchases = getPurchasesPlugin();
      if (!purchases) {
        return { ok: false, code: Logic.PURCHASE_ERROR.NOT_CONFIGURED };
      }
      var result = await purchases.purchasePackage({ aPackage: pkg });
      var ent = _config.entitlementId || 'basic';
      var has = Logic.hasEntitlement(result.customerInfo, ent);
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
      var purchases = getPurchasesPlugin();
      if (!purchases) {
        return { ok: false, code: Logic.PURCHASE_ERROR.NOT_CONFIGURED };
      }
      var result = await purchases.restorePurchases();
      var ent = _config.entitlementId || 'basic';
      var has = Logic.hasEntitlement(result.customerInfo, ent);
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
    var familyId = (detail && detail.familyId) || getFamilyId();
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
