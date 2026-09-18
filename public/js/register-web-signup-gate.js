/**
 * Close public web signup: browsers see store download, native WebView keeps register.
 * Invite links keep the existing form on every platform.
 */
(function (global) {
  'use strict';

  function isNativeShell() {
    if (global.Platform && typeof global.Platform.isNative === 'function' && global.Platform.isNative()) {
      return true;
    }
    var root = global.document && global.document.documentElement;
    if (root && root.classList) {
      if (root.classList.contains('platform-native')) return true;
      if (root.classList.contains('is-native')) return true;
    }
    return typeof Capacitor !== 'undefined' &&
      typeof Capacitor.isNativePlatform === 'function' &&
      Capacitor.isNativePlatform();
  }

  function hasInviteToken(search) {
    var query = search;
    if (query == null) {
      query = (global.location && global.location.search) || '';
    }
    return /(?:^|[?&])(?:invite|token)=/.test(String(query));
  }

  function shouldClosePublicSignup(opts) {
    opts = opts || {};
    if (hasInviteToken(opts.search)) return false;
    if (isNativeShell()) return false;
    return true;
  }

  function apply() {
    var close = shouldClosePublicSignup();
    var download = global.document && global.document.getElementById('webSignupDownload');
    var nativeRoot = global.document && global.document.getElementById('registerNativeSignup');
    if (download) download.hidden = !close;
    if (nativeRoot) nativeRoot.hidden = close;
    if (close) {
      var form = global.document && global.document.getElementById('registerForm');
      if (form && form.classList) form.classList.add('hidden');
    }
    return close;
  }

  global.RegisterWebSignupGate = {
    isNativeShell: isNativeShell,
    hasInviteToken: hasInviteToken,
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
