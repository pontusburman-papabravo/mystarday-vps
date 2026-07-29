/**
 * login-locale.js — Persist explicit pre-auth language switcher choice through login.
 * Only sends preferred_locale when the user actively clicked the switcher — not when
 * I18n auto-detected locale from the browser (sessionStorage display hint).
 */
(function loginLocaleModule() {
  'use strict';

  const STORAGE_KEY = (window.I18n && I18n.STORAGE_KEY) || 'sd_preferred_locale';
  /** Set to '1' only when user clicks locale switcher (or registration language gate). */
  const EXPLICIT_KEY = 'sd_locale_explicit_choice';

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

  function hasExplicitChoice() {
    try {
      return sessionStorage.getItem(EXPLICIT_KEY) === '1'
        || localStorage.getItem(EXPLICIT_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function getPreAuthLocaleChoice() {
    if (!hasExplicitChoice()) return null;
    try {
      return normalizeLocale(
        sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY)
      );
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
    EXPLICIT_KEY,
    hasExplicitChoice,
    getPreAuthLocaleChoice,
    withLoginLocale,
  };
})();
