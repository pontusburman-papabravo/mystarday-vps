(function () {
  'use strict';

  const Logic = typeof IapNativeClientLogic !== 'undefined' ? IapNativeClientLogic : null;

  let selectedTier = 'yearly';
  let purchaseInProgress = false;
  let pricesReady = false;

  function isPaywallPage() {
    const path = (window.location.pathname || '').replace(/\/$/, '') || '/';
    return path === '/paywall';
  }

  function isNative() {
    return (typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative()) ||
      (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  }

  function isAndroid() {
    return typeof Platform !== 'undefined' && Platform.getPlatform &&
      Platform.getPlatform() === 'android';
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
    const el = document.getElementById('paywallStatus');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('text-red-600', !!isError);
    el.classList.toggle('text-navy', !isError);
    show(el);
  }

  function clearStatus() {
    const el = document.getElementById('paywallStatus');
    if (!el) return;
    el.textContent = '';
    hide(el);
  }

  function applyStaticI18n() {
    if (!window.I18n) return;
    I18n.apply(document);
    document.documentElement.lang = (I18n.lang || 'sv-SE').toLowerCase().startsWith('en') ? 'en' : 'sv';
  }

  function applyAutoRenewCopy() {
    const el = document.getElementById('paywallAutoRenew');
    if (!el) return;
    const key = isAndroid() ? 'paywall.autoRenewGoogle' : 'paywall.autoRenewApple';
    el.textContent = t(key);
    el.setAttribute('data-i18n', key);
  }

  async function applyPaywallLegalLinks(countryCode) {
    if (!window.LegalRoutes || !LegalRoutes.fetchLegalRoutes || !countryCode) return null;
    const locale = (window.I18n && I18n.getCurrentLang && I18n.getCurrentLang()) || 'sv-SE';
    try {
      const routes = await LegalRoutes.fetchLegalRoutes(countryCode, locale);
      if (LegalRoutes.applyToRegisterLinks) {
        LegalRoutes.applyToRegisterLinks(routes);
      }
      return routes;
    } catch (_) {
      return null;
    }
  }

  function renderTierPrices(displays, config) {
    if (!Logic) return;

    const monthlyTrialDays = (config.packages && config.packages.monthly && config.packages.monthly.trial_days) || null;
    const yearlyTrialDays = (config.packages && config.packages.yearly && config.packages.yearly.trial_days) || null;

    const yearlyTermsKey = Logic.resolveTrialTermsKey(displays.yearly, yearlyTrialDays);
    const monthlyTermsKey = Logic.resolveTrialTermsKey(displays.monthly, monthlyTrialDays);

    const yearlyPriceEl = document.getElementById('planYearlyPrice');
    const yearlyTermsEl = document.getElementById('planYearlyTerms');
    const monthlyPriceEl = document.getElementById('planMonthlyPrice');
    const monthlyTermsEl = document.getElementById('planMonthlyTerms');

    if (yearlyPriceEl) {
      yearlyPriceEl.textContent = t('paywall.yearlyPrice', { price: displays.yearly.priceString });
    }
    if (monthlyPriceEl) {
      monthlyPriceEl.textContent = t('paywall.monthlyPrice', { price: displays.monthly.priceString });
    }
    if (yearlyTermsEl) {
      yearlyTermsEl.textContent = t('paywall.yearlyTerms' + yearlyTermsKey, {
        price: displays.yearly.priceString,
        trialDays: yearlyTrialDays || 14,
      });
    }
    if (monthlyTermsEl) {
      monthlyTermsEl.textContent = t('paywall.monthlyTerms' + monthlyTermsKey, {
        price: displays.monthly.priceString,
        trialDays: monthlyTrialDays || 14,
      });
    }
  }

  function updatePlanSelection() {
    const yearlyBtn = document.getElementById('planYearlyBtn');
    const monthlyBtn = document.getElementById('planMonthlyBtn');
    const yearlyCheck = document.getElementById('planYearlyCheck');
    const monthlyCheck = document.getElementById('planMonthlyCheck');

    const yearlySelected = selectedTier === 'yearly';

    if (yearlyBtn) {
      yearlyBtn.setAttribute('aria-pressed', yearlySelected ? 'true' : 'false');
      yearlyBtn.classList.toggle('border-2', yearlySelected);
      yearlyBtn.classList.toggle('border-gold', yearlySelected);
      yearlyBtn.classList.toggle('shadow-sm', yearlySelected);
      yearlyBtn.classList.toggle('border', !yearlySelected);
      yearlyBtn.classList.toggle('border-navy/10', !yearlySelected);
    }
    if (monthlyBtn) {
      monthlyBtn.setAttribute('aria-pressed', !yearlySelected ? 'true' : 'false');
      monthlyBtn.classList.toggle('border-2', !yearlySelected);
      monthlyBtn.classList.toggle('border-gold', !yearlySelected);
      monthlyBtn.classList.toggle('shadow-sm', !yearlySelected);
      monthlyBtn.classList.toggle('border', yearlySelected);
      monthlyBtn.classList.toggle('border-navy/10', yearlySelected);
    }
    if (yearlyCheck) {
      yearlyCheck.classList.toggle('border-gold', yearlySelected);
      yearlyCheck.classList.toggle('bg-gold', yearlySelected);
      yearlyCheck.innerHTML = yearlySelected
        ? '<span class="text-white text-xs font-bold">✓</span>'
        : '';
    }
    if (monthlyCheck) {
      monthlyCheck.classList.toggle('border-gold', !yearlySelected);
      monthlyCheck.classList.toggle('bg-gold', !yearlySelected);
      monthlyCheck.innerHTML = !yearlySelected
        ? '<span class="text-white text-xs font-bold">✓</span>'
        : '';
    }
  }

  function setPlanControlsDisabled(disabled) {
    ['planYearlyBtn', 'planMonthlyBtn', 'paywallPurchaseBtn', 'paywallRestoreBtn'].forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.disabled = !!disabled;
      if (id === 'planYearlyBtn' || id === 'planMonthlyBtn') {
        el.classList.toggle('opacity-50', !!disabled);
        el.classList.toggle('cursor-not-allowed', !!disabled);
      }
    });
  }

  function setPurchaseCtaEnabled(enabled) {
    const btn = document.getElementById('paywallPurchaseBtn');
    if (!btn) return;
    btn.disabled = !enabled || purchaseInProgress;
  }

  function showLoadingPrices(showing) {
    const loading = document.getElementById('paywallLoading');
    const plans = document.getElementById('paywallPlans');
    if (showing) {
      show(loading);
      hide(plans);
    } else {
      hide(loading);
      show(plans);
    }
  }

  function showNativePurchaseUi(showing) {
    const nativeActions = document.getElementById('paywallNativeActions');
    const subscriptionInfo = document.getElementById('paywallSubscriptionInfo');
    if (showing) {
      show(nativeActions);
      show(subscriptionInfo);
    } else {
      hide(nativeActions);
      hide(subscriptionInfo);
    }
  }

  function disablePlanCards() {
    ['planYearlyBtn', 'planMonthlyBtn'].forEach(function (id) {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    });
    setPurchaseCtaEnabled(false);
  }

  async function loadNativePricing() {
    if (!isNative() || !window.IAPManager) return false;

    showLoadingPrices(true);
    showNativePurchaseUi(false);
    disablePlanCards();
    pricesReady = false;

    await IAPManager.init();
    if (!IAPManager.canPurchase()) {
      showLoadingPrices(false);
      hide(document.getElementById('paywallPlans'));
      setStatus(t('paywall.statusUnavailable'), true);
      return false;
    }

    const offering = await IAPManager.getCurrentOffering();
    if (!offering || !Logic) {
      showLoadingPrices(false);
      hide(document.getElementById('paywallPlans'));
      setStatus(t('paywall.statusUnavailable'), true);
      return false;
    }

    const platform = isAndroid() ? 'android' : 'ios';
    const configRes = await fetch('/api/iap/config?platform=' + encodeURIComponent(platform), {
      credentials: 'include',
    });
    if (!configRes.ok) {
      showLoadingPrices(false);
      hide(document.getElementById('paywallPlans'));
      setStatus(t('paywall.statusUnavailable'), true);
      return false;
    }
    const config = await configRes.json();
    await applyPaywallLegalLinks(config.country_code);
    const displays = Logic.resolveOfferingTierDisplays(offering, config.packages);
    if (!displays) {
      showLoadingPrices(false);
      hide(document.getElementById('paywallPlans'));
      setStatus(t('paywall.statusUnavailable'), true);
      return false;
    }

    renderTierPrices(displays, config);
    showLoadingPrices(false);
    showNativePurchaseUi(true);
    pricesReady = true;
    setPlanControlsDisabled(false);
    setPurchaseCtaEnabled(true);
    updatePlanSelection();
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

  async function purchaseSelectedTier() {
    if (!window.IAPManager || !IAPManager.canPurchase() || !pricesReady || purchaseInProgress) {
      return;
    }

    purchaseInProgress = true;
    setPlanControlsDisabled(true);
    clearStatus();
    setStatus(t('paywall.statusOpening'), false);

    const result = await IAPManager.purchasePackage(selectedTier);

    if (!result.ok) {
      purchaseInProgress = false;
      setPlanControlsDisabled(false);
      setPurchaseCtaEnabled(true);

      if (result.code === 'PURCHASE_CANCELLED' || result.code === 'userCancelled' || result.code === 'user_cancelled') {
        clearStatus();
        return;
      }
      setStatus(t('paywall.statusFailed'), true);
      return;
    }

    await afterPurchaseSuccess(result.customerInfo);
  }

  async function restorePurchases() {
    if (!window.IAPManager || !IAPManager.canPurchase() || purchaseInProgress) {
      return;
    }

    purchaseInProgress = true;
    setPlanControlsDisabled(true);
    clearStatus();
    setStatus(t('paywall.statusRestoring'), false);

    const result = await IAPManager.restorePurchases();

    purchaseInProgress = false;
    setPlanControlsDisabled(false);
    setPurchaseCtaEnabled(pricesReady);

    if (!result.ok) {
      setStatus(t('paywall.statusFailed'), true);
      return;
    }
    if (result.active) {
      await syncBackendFromCustomerInfo();
      setStatus(t('paywall.restoreSuccess'), false);
      setTimeout(function () { window.location.href = '/dashboard'; }, 800);
      return;
    }
    setStatus(t('paywall.restoreNone'), false);
  }

  function configureWebMode() {
    show(document.getElementById('paywallWebNotice'));
    hide(document.getElementById('paywallPlans'));
    hide(document.getElementById('paywallLoading'));
    hide(document.getElementById('paywallNativeActions'));
    hide(document.getElementById('paywallSubscriptionInfo'));
    show(document.getElementById('paywallWebLegal'));
    show(document.getElementById('paywallWebActions'));
    show(document.getElementById('giftCardBtn'));
  }

  function configureNativeMode() {
    hide(document.getElementById('paywallWebNotice'));
    hide(document.getElementById('paywallWebLegal'));
    hide(document.getElementById('giftCardBtn'));
    hide(document.getElementById('giftRedeemPanel'));
    show(document.getElementById('paywallWebActions'));
    show(document.getElementById('paywallCloseBtn'));
    showLoadingPrices(true);
  }

  async function loadWebStoreLinks() {
    try {
      const cfgRes = await fetch('/api/iap/config?platform=ios', { credentials: 'include' });
      if (!cfgRes.ok) return;
      const cfg = await cfgRes.json();
      await applyPaywallLegalLinks(cfg.country_code);
      if (cfg.storeLinks) {
        const apple = document.getElementById('paywallAppleLink');
        const play = document.getElementById('paywallPlayLink');
        if (apple && cfg.storeLinks.apple) apple.href = cfg.storeLinks.apple;
        if (play && cfg.storeLinks.play) play.href = cfg.storeLinks.play;
      }
    } catch (_) {}
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

    applyAutoRenewCopy();

    try {
      const status = await Auth.api('/api/subscription/status');
      if (status.premium && status.premium.active) {
        window.location.href = '/dashboard';
        return;
      }
      if (status.paid_transition && status.paid_transition.kind === 'paywall') {
        const sub = document.getElementById('paywallSubtitle');
        if (sub) sub.textContent = t('paywall.launchEnded');
      }
    } catch (_) { /* continue */ }

    if (!isNative()) {
      configureWebMode();
      await loadWebStoreLinks();
    } else {
      configureNativeMode();
      await loadNativePricing();
    }

    document.getElementById('planYearlyBtn')?.addEventListener('click', function () {
      if (purchaseInProgress || !pricesReady) return;
      selectedTier = 'yearly';
      updatePlanSelection();
    });
    document.getElementById('planMonthlyBtn')?.addEventListener('click', function () {
      if (purchaseInProgress || !pricesReady) return;
      selectedTier = 'monthly';
      updatePlanSelection();
    });
    document.getElementById('paywallPurchaseBtn')?.addEventListener('click', function () {
      purchaseSelectedTier().catch(function () {
        purchaseInProgress = false;
        setPlanControlsDisabled(false);
        setPurchaseCtaEnabled(pricesReady);
        setStatus(t('paywall.statusFailed'), true);
      });
    });
    document.getElementById('paywallRestoreBtn')?.addEventListener('click', function () {
      restorePurchases().catch(function () {
        purchaseInProgress = false;
        setPlanControlsDisabled(false);
        setPurchaseCtaEnabled(pricesReady);
        setStatus(t('paywall.statusFailed'), true);
      });
    });
    document.getElementById('paywallCloseBtn')?.addEventListener('click', function () {
      window.location.href = '/limited-account';
    });
    document.getElementById('giftCardBtn')?.addEventListener('click', function () {
      show(document.getElementById('giftRedeemPanel'));
    });
    document.getElementById('giftRedeemBtn')?.addEventListener('click', async function () {
      const input = document.getElementById('giftCodeInput');
      const msg = document.getElementById('giftRedeemMsg');
      if (!input || !input.value.trim()) return;
      try {
        const res = await Auth.api('/api/gifts/redeem', {
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

  if (!isPaywallPage()) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaywall);
  } else {
    initPaywall();
  }
})();
