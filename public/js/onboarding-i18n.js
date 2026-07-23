/**
 * Onboarding i18n bootstrap — init after /api/auth/me so family.preferred_locale wins.
 * Exposes window.ot() / window.onboardingPlural() for onboarding modules.
 */
(function onboardingI18nModule() {
  'use strict';

  const BRAND_PARAM_KEYS = new Set([
    'onboarding.handoff.installBody',
    'onboarding.complete.welcomeFooter',
  ]);

  function applyPageTitle() {
    if (!window.I18n) return;
    const titleKey = document.body?.dataset?.i18nTitle;
    if (titleKey) {
      const translated = I18n.t(titleKey);
      if (translated && translated !== titleKey) {
        document.title = translated;
      }
    }
    const ogTitle = I18n.t('onboarding.pageTitle.ogTitle');
    if (ogTitle && ogTitle !== 'onboarding.pageTitle.ogTitle') {
      const ogTitleEl = document.querySelector('meta[property="og:title"]');
      if (ogTitleEl) ogTitleEl.setAttribute('content', ogTitle);
    }
    const ogDesc = I18n.t('onboarding.pageTitle.ogDescription');
    if (ogDesc && ogDesc !== 'onboarding.pageTitle.ogDescription') {
      const ogDescEl = document.querySelector('meta[property="og:description"]');
      if (ogDescEl) ogDescEl.setAttribute('content', ogDesc);
    }
  }

  function applyOnboardingDom() {
    if (!window.I18n) return;
    I18n.apply();
    const brand = I18n.t('onboarding.common.brand');
    document.querySelectorAll('[data-i18n="onboarding.common.brand"]').forEach((el) => {
      const text = I18n.t('onboarding.common.brand');
      if (text !== 'onboarding.common.brand') el.textContent = text;
    });
    BRAND_PARAM_KEYS.forEach((key) => {
      document.querySelectorAll(`[data-i18n="${key}"]`).forEach((el) => {
        const text = I18n.t(key, { brand });
        if (text !== key) el.textContent = text;
      });
    });
    const appTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appTitleMeta && brand !== 'onboarding.common.brand') {
      appTitleMeta.setAttribute('content', brand);
    }
  }

  /**
   * Initialise locale from authenticated user, apply DOM translations.
   * @param {string} [preferredLocale]
   * @returns {Promise<void>}
   */
  async function initOnboardingI18n(preferredLocale) {
    if (!window.I18n) return;
    await I18n.init(preferredLocale);
    applyOnboardingDom();
    applyPageTitle();
    document.dispatchEvent(new CustomEvent('onboarding-i18n-ready', {
      detail: { lang: I18n.getCurrentLang() },
    }));
  }

  function ot(key, params) {
    if (!window.I18n) return key;
    return I18n.t(key, params);
  }

  function onboardingPlural(key, count, params) {
    if (!window.I18n) return key;
    return I18n.plural(key, count, params);
  }

  document.addEventListener('locale-changed', () => {
    if (!window.I18n) return;
    applyOnboardingDom();
    applyPageTitle();
    document.dispatchEvent(new CustomEvent('onboarding-i18n-ready', {
      detail: { lang: I18n.getCurrentLang() },
    }));
  });

  window.initOnboardingI18n = initOnboardingI18n;
  window.ot = ot;
  window.onboardingPlural = onboardingPlural;
})();
