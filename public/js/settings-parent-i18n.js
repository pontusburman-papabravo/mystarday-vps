/**
 * settings-parent-i18n.js — Bootstrap parent locale on /settings (data-i18n + document lang).
 */
(function settingsParentI18nModule() {
  'use strict';

  var READY_ATTR = 'parentI18nReady';

  function normalizeLang(locale) {
    if (!locale || typeof locale !== 'string') return 'sv';
    return locale.toLowerCase().startsWith('en') ? 'en' : 'sv';
  }

  function textOf(selector) {
    var el = document.querySelector(selector);
    if (!el) return '';
    return String(el.textContent || '').trim();
  }

  function collectSettingsI18nProbe() {
    return {
      html_lang: document.documentElement.lang || '',
      parent_i18n_ready: document.documentElement.dataset[READY_ATTR] === 'true',
      settings_title_text: textOf('[data-i18n="settings.title"]'),
      family_section_title_text: textOf('[data-i18n="settings.family.title"]'),
      family_save_text: textOf('[data-i18n="settings.family.save"]'),
    };
  }

  /**
   * @param {string} lang — resolved I18n lang (e.g. en-GB, sv-SE)
   * @returns {{ ok: boolean, reasons: string[] }}
   */
  function isSettingsDomReadyForLocale(lang) {
    var reasons = [];
    var probe = collectSettingsI18nProbe();
    var htmlLang = (probe.html_lang || '').toLowerCase();
    var isEn = String(lang || '').toLowerCase().startsWith('en');

    if (isEn) {
      if (!htmlLang.startsWith('en')) reasons.push('html_lang_not_en');
    } else if (!htmlLang.startsWith('sv')) {
      reasons.push('html_lang_not_sv');
    }

    if (!window.I18n || typeof I18n.t !== 'function') {
      reasons.push('i18n_missing');
      return { ok: false, reasons: reasons };
    }

    var expectedTitle = I18n.t('settings.title');
    var expectedFamilyTitle = I18n.t('settings.family.title');
    var expectedSave = I18n.t('settings.family.save');

    if (!probe.settings_title_text || probe.settings_title_text !== expectedTitle) {
      reasons.push('settings_title_mismatch');
    }
    if (!probe.family_save_text || probe.family_save_text !== expectedSave) {
      reasons.push('family_save_mismatch');
    }
    if (!probe.family_section_title_text || probe.family_section_title_text !== expectedFamilyTitle) {
      reasons.push('family_section_title_mismatch');
    }

    var bodyLower = (document.body && document.body.innerText ? document.body.innerText : '').toLowerCase();
    if (isEn) {
      if (bodyLower.indexOf('familjeinställningar') !== -1) reasons.push('swedish_familjeinställningar_leak');
      if (bodyLower.indexOf('spara familjeinställningar') !== -1) {
        reasons.push('swedish_spara_familjeinställningar_leak');
      }
    }

    return { ok: reasons.length === 0, reasons: reasons, probe: probe };
  }

  function clearParentI18nReady() {
    try {
      delete document.documentElement.dataset[READY_ATTR];
    } catch (e) {
      document.documentElement.removeAttribute('data-' + READY_ATTR);
    }
  }

  function markParentI18nReady(lang) {
    document.documentElement.dataset[READY_ATTR] = 'true';
    document.dispatchEvent(
      new CustomEvent('settings-parent-i18n-ready', { detail: { lang: lang || null } })
    );
  }

  /**
   * @param {{ preferred_locale?: string } | null} me
   */
  async function bootSettingsParentI18n(me) {
    clearParentI18nReady();
    if (!me || typeof window.initParentAppI18n !== 'function') return;

    await initParentAppI18n(me.preferred_locale);
    if (window.I18n && typeof I18n.apply === 'function') {
      I18n.apply();
    }

    var lang =
      window.I18n && I18n.getCurrentLang ? I18n.getCurrentLang() : me.preferred_locale;
    if (lang) {
      document.documentElement.lang = normalizeLang(lang);
    }

    var readyCheck = isSettingsDomReadyForLocale(lang || me.preferred_locale || 'sv-SE');
    if (!readyCheck.ok) {
      console.warn('[settings-i18n] DOM not localized yet', readyCheck.reasons);
      return;
    }

    markParentI18nReady(lang);
  }

  window.bootSettingsParentI18n = bootSettingsParentI18n;
  window.collectSettingsI18nProbe = collectSettingsI18nProbe;
  window.isSettingsDomReadyForLocale = isSettingsDomReadyForLocale;
})();
