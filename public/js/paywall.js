(function () {
  'use strict';

  var Logic = typeof IapNativeClientLogic !== 'undefined' ? IapNativeClientLogic : null;

  function isNative() {
    return (typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative()) ||
      (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  }

  function show(el) { if (el) el.classList.remove('hidden'); }
  function hide(el) { if (el) el.classList.add('hidden'); }

  function t(key, params) {
    if (window.I18n && typeof I18n.t === 'function') {
      return I18n.t(key, params || {});
    }
    return key;
  }

  function setStatus(msg, isError) {
    var el = document.getElementById('paywallStatus');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('text-red-600', !!isError);
    el.classList.toggle('text-navy', !isError);
    show(el);
  }

  function applyStaticI18n() {
    if (!window.I18n) return;
    I18n.apply(document);
    document.documentElement.lang = (I18n.lang || 'sv-SE').toLowerCase().startsWith('en') ? 'en' : 'sv';
  }

  function tierTermsKey(hasIntro) {
    return hasIntro ? 'TermsKnownTrial' : 'TermsNoTrial';
  }

  function renderTierPrices(displays, config) {
    var monthlyTrialDays = (config.packages && config.packages.monthly && config.packages.monthly.trial_days) || null;
    var yearlyTrialDays = (config.packages && config.packages.yearly && config.packages.yearly.trial_days) || null;
    var monthlyHasIntro = !!(displays.monthly && displays.monthly.introPriceString);
    var yearlyHasIntro = !!(displays.yearly && displays.yearly.introPriceString);

    var yearlyPriceEl = document.getElementById('planYearlyPrice');
    var yearlyTermsEl = document.getElementById('planYearlyTerms');
    var monthlyPriceEl = document.getElementById('planMonthlyPrice');
    var monthlyTermsEl = document.getElementById('planMonthlyTerms');

    if (yearlyPriceEl) {
      yearlyPriceEl.textContent = t('paywall.yearlyPrice', { price: displays.yearly.priceString });
    }
    if (monthlyPriceEl) {
      monthlyPriceEl.textContent = t('paywall.monthlyPrice', { price: displays.monthly.priceString });
    }
    if (yearlyTermsEl) {
      yearlyTermsEl.textContent = t('paywall.yearly' + tierTermsKey(yearlyHasIntro), {
        price: displays.yearly.priceString,
        trialDays: yearlyTrialDays || 14,
      });
    }
    if (monthlyTermsEl) {
      monthlyTermsEl.textContent = t('paywall.monthly' + tierTermsKey(monthlyHasIntro), {
        price: displays.monthly.priceString,
        trialDays: monthlyTrialDays || 14,
      });
    }
  }

  function disablePurchaseButtons() {
    ['planYearlyBtn', 'planMonthlyBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    });
  }

  async function loadNativePricing() {
    if (!isNative() || !window.IAPManager) return false;
    await IAPManager.init();
    if (!IAPManager.canPurchase()) {
      disablePurchaseButtons();
      setStatus(t('paywall.statusUnavailable'), true);
      return false;
    }

    var offering = await IAPManager.getCurrentOffering();
    if (!offering || !Logic) {
      disablePurchaseButtons();
      setStatus(t('paywall.statusUnavailable'), true);
      return false;
    }

    var configRes = await fetch('/api/iap/config?platform=' + encodeURIComponent(
      (window.Platform && Platform.getPlatform && Platform.getPlatform() === 'android') ? 'android' : 'ios'
    ), { credentials: 'include' });
    if (!configRes.ok) {
      disablePurchaseButtons();
      setStatus(t('paywall.statusUnavailable'), true);
      return false;
    }
    var config = await configRes.json();
    var displays = Logic.resolveOfferingTierDisplays(offering, config.packages);
    if (!displays) {
      disablePurchaseButtons();
      setStatus(t('paywall.statusUnavailable'), true);
      return false;
    }

    renderTierPrices(displays, config);
    if (config.storeLinks) {
      var apple = document.getElementById('paywallAppleLink');
      var play = document.getElementById('paywallPlayLink');
      if (apple && config.storeLinks.apple) apple.href = config.storeLinks.apple;
      if (play && config.storeLinks.play) play.href = config.storeLinks.play;
    }
    return true;
  }

  async function syncBackendFromCustomerInfo() {
    if (!window.Auth || !Auth.api) return;
    await Auth.api('/api/iap/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    }).catch(function () {});
  }

  async function afterPurchaseSuccess() {
    await syncBackendFromCustomerInfo();
    setStatus(t('paywall.statusSuccess'), false);
    setTimeout(function () { window.location.href = '/dashboard'; }, 800);
  }

  async function purchaseTier(tier) {
    if (!window.IAPManager || !IAPManager.canPurchase()) {
      setStatus(t('paywall.statusNotNative'), true);
      return;
    }
    setStatus(t('paywall.statusOpening'), false);
    var result = await IAPManager.purchasePackage(tier);
    if (!result.ok) {
      if (result.code === 'PURCHASE_CANCELLED' || result.code === 'userCancelled' || result.code === 'user_cancelled') {
        setStatus(t('paywall.statusCancelled'), false);
        return;
      }
      setStatus(t('paywall.statusFailed'), true);
      return;
    }
    await afterPurchaseSuccess(result.customerInfo);
  }

  async function initPaywall() {
    if (!window.Auth || !Auth.requireAuth) {
      window.location.href = '/login?next=' + encodeURIComponent('/paywall');
      return;
    }
    await Auth.requireAuth();

    if (window.I18n) {
      await I18n.init();
      applyStaticI18n();
    }

    try {
      var status = await Auth.api('/api/subscription/status');
      if (status.premium && status.premium.active) {
        window.location.href = '/dashboard';
        return;
      }
    } catch (_) { /* continue */ }

    if (!isNative()) {
      show(document.getElementById('paywallWebNotice'));
      hide(document.getElementById('paywallPlans'));
      try {
        var cfgRes = await fetch('/api/iap/config?platform=ios', { credentials: 'include' });
        if (cfgRes.ok) {
          var cfg = await cfgRes.json();
          if (cfg.storeLinks) {
            var apple = document.getElementById('paywallAppleLink');
            var play = document.getElementById('paywallPlayLink');
            if (apple && cfg.storeLinks.apple) apple.href = cfg.storeLinks.apple;
            if (play && cfg.storeLinks.play) play.href = cfg.storeLinks.play;
          }
        }
      } catch (_) {}
    } else {
      await loadNativePricing();
    }

    document.getElementById('planYearlyBtn')?.addEventListener('click', function () {
      purchaseTier('yearly');
    });
    document.getElementById('planMonthlyBtn')?.addEventListener('click', function () {
      purchaseTier('monthly');
    });
    document.getElementById('paywallCloseBtn')?.addEventListener('click', function () {
      window.location.href = '/limited-account';
    });
    document.getElementById('giftCardBtn')?.addEventListener('click', function () {
      show(document.getElementById('giftRedeemPanel'));
    });
    document.getElementById('giftRedeemBtn')?.addEventListener('click', async function () {
      var input = document.getElementById('giftCodeInput');
      var msg = document.getElementById('giftRedeemMsg');
      if (!input || !input.value.trim()) return;
      try {
        var res = await Auth.api('/api/gifts/redeem', {
          method: 'POST',
          body: JSON.stringify({ code: input.value.trim() }),
        });
        if (msg) {
          msg.textContent = res.message || t('paywall.giftSuccess');
          msg.classList.remove('hidden');
          msg.classList.remove('text-red-600');
        }
        setTimeout(function () { window.location.href = '/dashboard'; }, 900);
      } catch (err) {
        if (msg) {
          msg.textContent = (err && err.message) || t('paywall.giftFailed');
          msg.classList.remove('hidden');
          msg.classList.add('text-red-600');
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaywall);
  } else {
    initPaywall();
  }
})();
