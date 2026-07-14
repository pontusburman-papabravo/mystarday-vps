/**
 * parent-avatar-menu.js — Legacy hook: refresh billing access on parent shell pages.
 * Header chrome (dela, notiser, kugghjul) lives in parent-nav-header.js.
 */
(function () {
  'use strict';

  if (!window.NavConfig || !window.Auth) return;

  const path = NavConfig.normalizePath(window.location.pathname);
  if (path === '/login' || path === '/child-login' || path.indexOf('/admin') === 0) return;
  if (!NavConfig.isParentShellPath(path) && path !== '/settings') return;

  async function boot() {
    if (!Auth.isLoggedIn()) return;
    if (window.BillingUi && BillingUi.refresh) {
      try { await BillingUi.refresh(); } catch (_) { /* ignore */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
