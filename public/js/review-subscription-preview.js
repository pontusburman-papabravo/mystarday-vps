/**
 * review-subscription-preview.js — static App Store / Google Play review
 * screenshot aid for /review/subscription-preview.
 *
 * Deliberately does NOT:
 *   - fetch /api/iap/config or any other network endpoint
 *   - reference window.IAPManager at all
 *   - call Purchases.configure / purchasePackage / restorePurchases / logIn
 *   - attach any click handler to the purchase/restore buttons
 *
 * Prices shown are the intended reference prices from
 * config/iap-product-contract.js (59 SEK/month, 590 SEK/year), matching what
 * the real paywall will show once RevenueCat/store products are configured.
 * They are hardcoded here on purpose — this page never calls a pricing API.
 */
(function () {
  'use strict';

  var REFERENCE_PRICE_MONTHLY = '59 kr';
  var REFERENCE_PRICE_YEARLY = '590 kr';
  var REFERENCE_TRIAL_DAYS = 14;

  function isReviewPreviewPage() {
    var path = (window.location.pathname || '').replace(/\/$/, '') || '/';
    return path === '/review/subscription-preview';
  }

  function t(key, params) {
    if (window.I18n && typeof I18n.t === 'function') {
      return I18n.t(key, params || {});
    }
    return key;
  }

  function storeParam() {
    var params = new URLSearchParams(window.location.search || '');
    return params.get('store') === 'google' ? 'google' : 'apple';
  }

  function applyAutoRenewCopy() {
    var el = document.getElementById('paywallAutoRenew');
    if (!el) return;
    var key = storeParam() === 'google' ? 'paywall.autoRenewGoogle' : 'paywall.autoRenewApple';
    el.textContent = t(key);
    el.setAttribute('data-i18n', key);
  }

  function renderReferencePrices() {
    var yearlyPriceEl = document.getElementById('planYearlyPrice');
    var yearlyTermsEl = document.getElementById('planYearlyTerms');
    var monthlyPriceEl = document.getElementById('planMonthlyPrice');
    var monthlyTermsEl = document.getElementById('planMonthlyTerms');

    if (yearlyPriceEl) {
      yearlyPriceEl.textContent = t('paywall.yearlyPrice', { price: REFERENCE_PRICE_YEARLY });
    }
    if (monthlyPriceEl) {
      monthlyPriceEl.textContent = t('paywall.monthlyPrice', { price: REFERENCE_PRICE_MONTHLY });
    }
    if (yearlyTermsEl) {
      yearlyTermsEl.textContent = t('paywall.yearlyTermsKnownTrial', {
        price: REFERENCE_PRICE_YEARLY,
        trialDays: REFERENCE_TRIAL_DAYS,
      });
    }
    if (monthlyTermsEl) {
      monthlyTermsEl.textContent = t('paywall.monthlyTermsKnownTrial', {
        price: REFERENCE_PRICE_MONTHLY,
        trialDays: REFERENCE_TRIAL_DAYS,
      });
    }
  }

  function applyStaticI18n() {
    if (!window.I18n) return;
    I18n.apply(document);
    document.documentElement.lang = (I18n.lang || 'sv-SE').toLowerCase().startsWith('en') ? 'en' : 'sv';
  }

  async function initReviewPreview() {
    if (window.I18n) {
      await I18n.init();
      applyStaticI18n();
    }
    applyAutoRenewCopy();
    renderReferencePrices();
  }

  if (!isReviewPreviewPage()) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReviewPreview);
  } else {
    initReviewPreview();
  }
})();
