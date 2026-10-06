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
  let fetchedLocales = null;

  function catalogLocales() {
    const embedded = window.I18n && I18n.CATALOG && I18n.CATALOG.locales;
    if (Array.isArray(embedded) && embedded.length) return embedded;
    return fetchedLocales || [];
  }

  /**
   * Same resolution as I18n._normalize: exact id, alias, then a unique base.
   * An unknown tag stays null. It is never rewritten to the default locale.
   */
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

  function primeCatalog() {
    if (catalogLocales().length || typeof fetch !== 'function') return;
    fetch('/api/i18n', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.locales) && data.locales.length) {
          fetchedLocales = data.locales;
        }
      })
      .catch(() => {});
  }
  primeCatalog();

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
    normalizeLocale,
  };
})();
