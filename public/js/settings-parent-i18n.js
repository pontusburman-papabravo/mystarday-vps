/**
 * settings-parent-i18n.js — Bootstrap parent locale on /settings (data-i18n + document lang).
 */
(function settingsParentI18nModule() {
  'use strict';

  /**
   * @param {{ preferred_locale?: string } | null} me
   */
  async function bootSettingsParentI18n(me) {
    if (!me || typeof window.initParentAppI18n !== 'function') return;
    await initParentAppI18n(me.preferred_locale);
    const lang = window.I18n && I18n.getCurrentLang ? I18n.getCurrentLang() : me.preferred_locale;
    if (lang) {
      document.documentElement.lang = lang.startsWith('en') ? 'en' : 'sv';
    }
  }

  window.bootSettingsParentI18n = bootSettingsParentI18n;
})();
