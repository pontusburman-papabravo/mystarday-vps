/**
 * login-locale.js — Persist pre-auth language switcher choice through login.
 */
(function loginLocaleModule() {
  'use strict';

  const STORAGE_KEY = (window.I18n && I18n.STORAGE_KEY) || 'sd_preferred_locale';

  function normalizeLocale(raw) {
    if (!raw) return null;
    if (window.I18n && typeof I18n._normalize === 'function') {
      return I18n._normalize(raw);
    }
    const s = String(raw).trim();
    if (s === 'sv-SE' || s === 'sv') return 'sv-SE';
    if (s === 'en-GB' || s === 'en') return 'en-GB';
    return null;
  }

  function getPreAuthLocaleChoice() {
    try {
      return normalizeLocale(sessionStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return null;
    }
  }

  function withLoginLocale(body) {
    const preferred_locale = getPreAuthLocaleChoice();
    if (!preferred_locale) return body;
    return Object.assign({}, body, { preferred_locale });
  }

  window.LoginLocale = {
    getPreAuthLocaleChoice: getPreAuthLocaleChoice,
    withLoginLocale: withLoginLocale,
  };
})();
