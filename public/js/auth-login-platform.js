/**
 * auth-login-platform.js — platform auth method matrix for login/register.
 */
(function () {
  'use strict';

  function getPlatformKind() {
    if (!window.Platform) return 'web';
    if (typeof Platform.isNative === 'function' && Platform.isNative()) {
      if (typeof Platform.isIOS === 'function' && Platform.isIOS()) return 'ios-native';
      if (typeof Platform.isAndroid === 'function' && Platform.isAndroid()) return 'android';
    }
    return 'web';
  }

  /** @returns {{ apple: boolean, google: boolean, email: boolean, childLink: boolean }} */
  function getAuthMethods() {
    const kind = getPlatformKind();
    if (kind === 'ios-native') {
      return { apple: true, google: false, email: true, childLink: true };
    }
    if (kind === 'android') {
      return { apple: false, google: true, email: true, childLink: true };
    }
    return { apple: true, google: true, email: true, childLink: true };
  }

  function setSectionVisible(id, visible) {
    const el = document.getElementById(id);
    if (!el) return;
    if (visible) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }

  function loadAppConfig() {
    return fetch('/api/app-config', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .catch(function () { return {}; });
  }

  /**
   * Show/hide OAuth sections per platform matrix (+ web client-id guard).
   * @param {{ page?: 'login'|'register' }} opts
   */
  async function applyAuthSections(opts) {
    opts = opts || {};
    const page = opts.page === 'register' ? 'register' : 'login';
    const suffix = page === 'register' ? 'Register' : 'Login';
    const methods = getAuthMethods();
    let showApple = methods.apple;
    let showGoogle = methods.google;

    if (getPlatformKind() === 'web' && (showApple || showGoogle)) {
      const cfg = await loadAppConfig();
      if (showApple && !(cfg && cfg.appleClientId)) showApple = false;
      if (showGoogle && !(cfg && cfg.googleWebClientId)) showGoogle = false;
    }

    setSectionVisible('apple' + suffix + 'Section', showApple);
    setSectionVisible('google' + suffix + 'Section', showGoogle);

    if (methods.childLink) {
      ['childLoginFooterLink', 'childLoginLink'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
      });
    }

    document.querySelectorAll('.ios-caption').forEach(function (cap) {
      cap.style.display = getPlatformKind() === 'ios-native' ? '' : 'none';
    });
  }

  window.AuthLoginPlatform = {
    getPlatformKind: getPlatformKind,
    getAuthMethods: getAuthMethods,
    applyAuthSections: applyAuthSections,
  };
})();
