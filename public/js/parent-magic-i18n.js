/**
 * parent-magic-i18n.js — Shared i18n bootstrap for parent magic pages.
 * Early apply from sessionStorage; full init after authGuard with family.preferred_locale.
 */
(function () {
  'use strict';

  function earlyApply() {
    var lang = null;
    try {
      lang = sessionStorage.getItem('sd_preferred_locale');
    } catch (_) { /* ignore */ }
    if (!window.I18n || !lang) return Promise.resolve();
    return I18n.init(lang).then(function () {
      if (typeof I18n.apply === 'function') I18n.apply();
    }).catch(function () {});
  }

  async function initFromAuth() {
    if (typeof window.initParentAppI18n !== 'function') return;
    var user = null;
    if (typeof window.authGuard === 'function') {
      user = await window.authGuard();
    } else if (window.Auth && typeof Auth.getCurrentUser === 'function') {
      user = await Auth.getCurrentUser();
    }
    if (!user) return;
    await initParentAppI18n(user.preferred_locale);
    if (window.ParentMagicPageHub && typeof ParentMagicPageHub.applyHubCopy === 'function') {
      ParentMagicPageHub.applyHubCopy();
    }
    if (window.PlanningHub && typeof PlanningHub.render === 'function') {
      PlanningHub.render();
    }
    if (window.LibraryMagicHub && typeof LibraryMagicHub.render === 'function') {
      LibraryMagicHub.render();
    }
  }

  function boot() {
    earlyApply().then(function () {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFromAuth);
      } else {
        initFromAuth();
      }
    });
  }

  boot();
})();
