/**
 * iap-manager.js — In-App Purchase infrastructure for Min Stjärndag.
 *
 * WHAT: RevenueCat SDK init on native, subscription status checks,
 * platform-gating for payment UI (Stripe blocked on native).
 *
 * WHAT NOT: does NOT build a paywall or trigger purchases — that comes later.
 * Does NOT load RevenueCat on web (PAYMENT_ENABLED=false on web always).
 *
 * Requires: @revenuecat/purchases-capacitor npm package in the Capacitor bundle.
 */

(function () {
  'use strict';

  var PRODUCT_ID = 'se.mystarday.app.basic';
  var ENTITLEMENT_ID = 'basic';

  // ── Internal state ─────────────────────────────────────
  var _initialized = false;
  var _initPromise = null;
  var _isNative = null;

  // ── Platform detection (mirrors platform.js pattern) ────
  function isNative() {
    if (_isNative !== null) return _isNative;
    _isNative = typeof window !== 'undefined' &&
      typeof window.Platform !== 'undefined' &&
      typeof window.Platform.isNative === 'function' &&
      window.Platform.isNative();
    return _isNative;
  }

  // ── RevenueCat API key (fetched from backend for authenticated native clients) ────
  var _cachedApiKey = null;

  async function getApiKey() {
    if (_cachedApiKey !== null) return _cachedApiKey;
    try {
      var res = await fetch('/api/iap/config', { credentials: 'include' });
      if (res.ok) {
        var data = await res.json();
        _cachedApiKey = data.apiKey || null;
      } else {
        _cachedApiKey = null;
      }
    } catch (_) {
      _cachedApiKey = null;
    }
    return _cachedApiKey;
  }

  // ── SDK initialization ──────────────────────────────────
  /**
   * Initialize RevenueCat SDK (native only).
   * Safe to call multiple times — returns the same promise.
   */
  async function init() {
    if (_initPromise) return _initPromise;

    if (!isNative()) {
      // Web: no IAP ever — mark initialized but skip RevenueCat entirely.
      _initialized = true;
      _initPromise = Promise.resolve();
      return _initPromise;
    }

    _initPromise = _doInit();
    return _initPromise;
  }

  async function _doInit() {
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');

      const apiKey = await getApiKey();
      if (!apiKey) {
        console.warn('[IAPManager] REVENUECAT_API_KEY not configured — skipping init');
        _initialized = true;
        return;
      }

      await Purchases.configure({ apiKey });

      // Set appUserID to family ID from auth context for RevenueCat attribution.
      var familyId = (typeof window !== 'undefined' && window.Auth && window.Auth.getFamilyId)
        ? window.Auth.getFamilyId()
        : null;
      if (familyId) {
        try {
          await Purchases.login(familyId);
          console.log('[IAPManager] RevenueCat configured, appUserID:', familyId);
        } catch (loginErr) {
          console.warn('[IAPManager] login() failed (non-fatal):', loginErr.message);
        }
      } else {
        console.log('[IAPManager] RevenueCat configured (no familyId set yet)');
      }

      _initialized = true;
    } catch (err) {
      console.error('[IAPManager] RevenueCat init failed:', err.message);
      _initialized = true; // mark initialized to avoid infinite retries
    }
  }

  // ── Subscription status ─────────────────────────────────
  /**
   * Returns true if the family has active access.
   *
   * Logic:
   *   1. If family.is_lifetime_free === true → return true immediately (no RevenueCat call).
   *   2. On web → return true (PAYMENT_ENABLED=false, no IAP).
   *   3. On native → check RevenueCat entitlement 'basic'.
   *   4. Fallback: read family.is_lifetime_free from localStorage if not in auth context.
   *
   * @param {{ is_lifetime_free?: boolean }} [familyInfo]
   * @returns {Promise<boolean>}
   */
  async function checkSubscriptionStatus(familyInfo) {
    // Web: PAYMENT_ENABLED=false — always allow.
    if (!isNative()) return true;

    // Lifetime-free fast path — skip RevenueCat entirely.
    if (familyInfo && familyInfo.is_lifetime_free === true) return true;

    // Check Auth.getUser() for is_lifetime_free as a fallback when familyInfo not passed.
    // auth.js stores the user object in localStorage under 'stjarndag_user'.
    // /api/auth/me now includes is_lifetime_free from the family row.
    try {
      var user = (typeof window !== 'undefined' && window.Auth && window.Auth.getUser)
        ? window.Auth.getUser()
        : null;
      if (user && user.is_lifetime_free === true) return true;
    } catch (_) {}

    // If we have familyInfo but is_lifetime_free is explicitly false, go to RevenueCat.
    // If unknown, go to RevenueCat to be safe.
    if (familyInfo && familyInfo.is_lifetime_free === false) {
      return await _checkRevenueCatEntitlement();
    }

    // Unknown → check RevenueCat.
    return await _checkRevenueCatEntitlement();
  }

  async function _checkRevenueCatEntitlement() {
    if (!_initialized) await init();

    try {
      var { Purchases } = await import('@revenuecat/purchases-capacitor');
      var customerInfo = await Purchases.getCustomerInfo();
      var active = customerInfo.entitlements.active;
      var hasBasic = !!(active && active[ENTITLEMENT_ID]);
      console.log('[IAPManager] entitlement check:', hasBasic ? 'active' : 'inactive');
      return hasBasic;
    } catch (err) {
      console.warn('[IAPManager] getCustomerInfo failed:', err.message);
      // On error, err on the side of allowing access — subscription check failed,
      // the backend is authoritative.
      return true;
    }
  }

  // ── Payment UI gating ───────────────────────────────────
  /**
   * True if payment-related UI (Stripe links, payment walls) should be shown.
   * On native: NEVER show external payment — use RevenueCat IAP only.
   * On web: controlled by PAYMENT_ENABLED env var (always false in this app).
   */
  function canShowPaymentUI() {
    return false; // Always false — this app has no web payment.
  }

  /**
   * True if RevenueCat purchase flow is available (native + SDK configured).
   */
  function canPurchase() {
    return isNative() && _initialized;
  }

  // ── App lifecycle: init on native startup ────────────────
  async function autoInit() {
    if (isNative()) {
      await init();
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoInit);
    } else {
      autoInit();
    }
  }

  // ── Expose global API ───────────────────────────────────
  window.IAPManager = {
    init,
    checkSubscriptionStatus,
    canShowPaymentUI,
    canPurchase,
    PRODUCT_ID,
    ENTITLEMENT_ID,
    isNative,
  };
})();