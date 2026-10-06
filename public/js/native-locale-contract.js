/**
 * native-locale-contract.js — Documents and helpers for native shell ↔ WebView locale.
 *
 * Rules:
 * 1. Before login: OS locale selects native Info.plist / Android resources.
 * 2. After login: family.preferred_locale is canonical for product copy in WebView.
 * 3. OS locale may suggest but never overwrites a saved family locale.
 * 4. locale-changed updates web UI immediately; native shell refreshes on next safe render.
 */
(function nativeLocaleContractModule() {
  'use strict';

  function catalogLocales() {
    const embedded = window.I18n && I18n.CATALOG && I18n.CATALOG.locales;
    return Array.isArray(embedded) ? embedded : [];
  }

  function configuredDefault() {
    if (window.I18n && I18n.DEFAULT_LOCALE) return I18n.DEFAULT_LOCALE;
    return 'sv-SE';
  }

  function normalizeAgainstCatalog(raw, locales) {
    if (!raw || !locales || !locales.length) return null;
    const s = String(raw).trim();
    if (!s) return null;
    for (let i = 0; i < locales.length; i++) {
      if (locales[i].id === s) return locales[i].id;
    }
    const lower = s.toLowerCase();
    for (let i = 0; i < locales.length; i++) {
      const aliases = locales[i].aliases || [];
      for (let a = 0; a < aliases.length; a++) {
        if (String(aliases[a]).toLowerCase() === lower) return locales[i].id;
      }
    }
    const base = lower.split(/[-_]/)[0];
    const baseHits = [];
    for (let i = 0; i < locales.length; i++) {
      if (locales[i].base === base) baseHits.push(locales[i].id);
    }
    if (baseHits.length === 1) return baseHits[0];
    return null;
  }

  function normalizeLocale(raw) {
    if (!raw) return null;
    if (window.I18n && typeof I18n._normalize === 'function') {
      return I18n._normalize(raw);
    }
    return normalizeAgainstCatalog(raw, catalogLocales());
  }

  /** OS / browser hint before auth — never persisted over server locale. */
  function getOsLocaleHint() {
    if (typeof window.I18n !== 'undefined' && typeof window.I18n._fromNavigator === 'function') {
      return window.I18n._fromNavigator() || configuredDefault();
    }
    const langs = navigator.languages || [navigator.language || ''];
    for (let i = 0; i < langs.length; i++) {
      const n = normalizeLocale(langs[i]);
      if (n) return n;
    }
    return configuredDefault();
  }

  /**
   * Apply family locale after login — delegates to I18n.init (single store).
   * @param {string} preferredLocale from /api/auth/me
   */
  async function applyFamilyLocale(preferredLocale) {
    if (!window.I18n || typeof window.I18n.init !== 'function') return null;
    const locale = normalizeLocale(preferredLocale) || configuredDefault();
    await window.I18n.init(locale);
    document.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale: locale } }));
    return locale;
  }

  window.NativeLocaleContract = {
    normalizeLocale: normalizeLocale,
    getOsLocaleHint: getOsLocaleHint,
    applyFamilyLocale: applyFamilyLocale,
  };
})();
