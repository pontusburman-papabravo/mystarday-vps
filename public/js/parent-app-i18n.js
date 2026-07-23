/**
 * Parent app i18n bootstrap — Home, Today, Journey coach chrome.
 * Init after auth so family.preferred_locale wins over sessionStorage.
 */
(function parentAppI18nModule() {
  'use strict';

  function applyPageTitle() {
    if (!window.I18n) return;
    const titleKey = document.body?.dataset?.i18nTitle;
    if (titleKey) {
      const brand = I18n.t('onboarding.common.brand');
      const brandParam = brand !== 'onboarding.common.brand' ? brand : 'My Starday';
      const translated = I18n.t(titleKey, { brand: brandParam });
      if (translated && translated !== titleKey) {
        document.title = translated;
      }
    }
  }

  function applyParentDom() {
    if (!window.I18n) return;
    I18n.apply();
    applyPageTitle();
  }

  /**
   * @param {string} [preferredLocale]
   * @returns {Promise<void>}
   */
  async function initParentAppI18n(preferredLocale) {
    if (!window.I18n) return;
    await I18n.init(preferredLocale);
    applyParentDom();
    document.dispatchEvent(new CustomEvent('parent-i18n-ready', {
      detail: { lang: I18n.getCurrentLang() },
    }));
  }

  function pt(key, params) {
    if (!window.I18n) return key;
    return I18n.t(key, params);
  }

  function parentPlural(key, count, params) {
    if (!window.I18n) return key;
    return I18n.plural(key, count, params);
  }

  function ptGet(key) {
    if (!window.I18n) return undefined;
    return I18n.get(key);
  }

  document.addEventListener('locale-changed', () => {
    if (!window.I18n) return;
    applyParentDom();
    document.dispatchEvent(new CustomEvent('parent-i18n-ready', {
      detail: { lang: I18n.getCurrentLang() },
    }));
  });

  window.initParentAppI18n = initParentAppI18n;
  window.pt = pt;
  window.parentPlural = parentPlural;
  window.ptGet = ptGet;
})();
