/**
 * package-access-cache.js — single shared promise for GET /api/subscription/access.
 * Loaded early (platform-html inject) so native-tab-bar, preview-shell, and child
 * scripts do not each fire a separate request per page.
 */
(function () {
  'use strict';

  window.fetchPackageAccess = function fetchPackageAccess(force) {
    if (!force && window._packageAccessPromise) return window._packageAccessPromise;

    window._packageAccessPromise = fetch('/api/subscription/access', { credentials: 'include' })
      .then(function (res) {
        if (!res.ok) throw new Error('access_fetch_failed');
        return res.json();
      })
      .then(function (access) {
        window._packageAccess = access;
        try {
          window.dispatchEvent(new CustomEvent('stjarndag-package-access-loaded', { detail: access }));
        } catch (_) { /* IE11 */ }
        return access;
      })
      .catch(function (err) {
        window._packageAccessPromise = null;
        throw err;
      });

    return window._packageAccessPromise;
  };
})();
