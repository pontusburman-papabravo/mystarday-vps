/**
 * Public web signup must stay open while Ireland is an acquisition market.
 * The previous store-only gate blocked ads → /en and ads → /register (ADR-023).
 * Invite links and native WebView already showed the form; browsers now do too.
 * The store-download panel remains in HTML for maintenance, but is not the default.
 */
(function (global) {
  'use strict';

  function isNativeShell() {
    if (global.Platform && typeof global.Platform.isNative === 'function' && global.Platform.isNative()) {
      return true;
    }
    const root = global.document && global.document.documentElement;
    if (root && root.classList) {
      if (root.classList.contains('platform-native')) return true;
      if (root.classList.contains('is-native')) return true;
    }
    return typeof Capacitor !== 'undefined' &&
      typeof Capacitor.isNativePlatform === 'function' &&
      Capacitor.isNativePlatform();
  }

  function hasInviteToken(search) {
    let query = search;
    if (query == null) {
      query = (global.location && global.location.search) || '';
    }
    return /(?:^|[?&])(?:invite|token)=/.test(String(query));
  }

  function isEnglishRegisterPath(pathname) {
    let path = pathname;
    if (path == null) {
      path = (global.location && global.location.pathname) || '';
    }
    return path === '/en/register' || String(path).indexOf('/en/register/') === 0;
  }

  function shouldClosePublicSignup(opts) {
    opts = opts || {};
    if (hasInviteToken(opts.search)) return false;
    if (isNativeShell()) return false;
    if (isEnglishRegisterPath(opts.pathname)) return false;
    // IE campaign is live: never hide the form behind a store-only wall.
    return false;
  }

  function apply() {
    const close = shouldClosePublicSignup({
      search: (global.location && global.location.search) || '',
      pathname: (global.location && global.location.pathname) || '',
    });
    const download = global.document && global.document.getElementById('webSignupDownload');
    const nativeRoot = global.document && global.document.getElementById('registerNativeSignup');
    if (download) download.hidden = !close;
    if (nativeRoot) nativeRoot.hidden = close;
    if (close) {
      const form = global.document && global.document.getElementById('registerForm');
      if (form && form.classList) form.classList.add('hidden');
    }
    return close;
  }

  global.RegisterWebSignupGate = {
    isNativeShell: isNativeShell,
    hasInviteToken: hasInviteToken,
    isEnglishRegisterPath: isEnglishRegisterPath,
    shouldClosePublicSignup: shouldClosePublicSignup,
    apply: apply,
  };

  if (!global.document) return;
  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})(typeof window !== 'undefined' ? window : this);
