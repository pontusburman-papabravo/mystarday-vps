/**
 * iap-manager.js — access stub (App Review: no in-app purchases in this version).
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
