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

  function normalizeLocale(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (s === 'sv-SE' || s === 'sv') return 'sv-SE';
    if (s === 'en-GB' || s === 'en') return 'en-GB';
    const base = s.split(/[-_]/)[0].toLowerCase();
    if (base === 'sv') return 'sv-SE';
    if (base === 'en') return 'en-GB';
    return null;
  }

  /** OS / browser hint before auth — never persisted over server locale. */
  function getOsLocaleHint() {
    if (typeof window.I18n !== 'undefined' && typeof window.I18n._fromNavigator === 'function') {
      return window.I18n._fromNavigator() || 'sv-SE';
    }
    const langs = navigator.languages || [navigator.language || ''];
    for (let i = 0; i < langs.length; i++) {
      const n = normalizeLocale(langs[i]);
      if (n) return n;
    }
    return 'sv-SE';
  }

  /**
   * Apply family locale after login — delegates to I18n.init (single store).
   * @param {string} preferredLocale from /api/auth/me
   */
  async function applyFamilyLocale(preferredLocale) {
    if (!window.I18n || typeof window.I18n.init !== 'function') return 'sv-SE';
    const locale = normalizeLocale(preferredLocale) || 'sv-SE';
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
