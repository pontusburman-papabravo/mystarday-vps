/**
 * iap-manager.js — subscription access stub (Build 14 / App Review).
 *
 * In-app purchases are not active in this version. All users have full access
 * during the founder program. IAP will be re-enabled in a future release.
 */

(function () {
  'use strict';

  function isNative() {
    return typeof window !== 'undefined' &&
      typeof window.Platform !== 'undefined' &&
      typeof window.Platform.isNative === 'function' &&
      window.Platform.isNative();
  }

  async function init() {
    return Promise.resolve();
  }

  async function checkSubscriptionStatus() {
    return true;
  }

  function canShowPaymentUI() {
    return false;
  }

  function canPurchase() {
    return false;
  }

  window.IAPManager = {
    init,
    checkSubscriptionStatus,
    canShowPaymentUI,
    canPurchase,
    isNative,
  };
})();
