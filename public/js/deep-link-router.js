/**
 * deep-link-router.js — Sprint 22b: native deep links + push-tap URLs.
 */
(function () {
  'use strict';

  function normalizeIncomingUrl(raw) {
    if (!raw) return null;
    try {
      var u = new URL(raw, window.location.origin);
      return u.pathname + (u.search || '');
    } catch (_) {
      if (raw.charAt(0) === '/') return raw;
      return null;
    }
  }

  /**
   * Map mystarday.se paths → in-app routes (WebView).
   */
  function mapDeepPath(pathAndQuery) {
    if (!pathAndQuery) return null;
    var path = pathAndQuery.split('?')[0].replace(/\/$/, '') || '/';
    var qs = pathAndQuery.indexOf('?') >= 0 ? pathAndQuery.slice(pathAndQuery.indexOf('?')) : '';

    if (path === '/invite' || path.indexOf('/invite/') === 0) {
      var inviteToken = path.split('/')[2] || new URLSearchParams(qs).get('token');
      return inviteToken ? '/register?invite=' + encodeURIComponent(inviteToken) : '/register' + qs;
    }
    if (path === '/accept-invite' || path.indexOf('/accept-invite/') === 0) {
      return '/accept-invite' + qs;
    }
    if (path === '/pedagog-invite' || path.indexOf('/pedagog-invite/') === 0) {
      return '/pedagog-invite' + qs;
    }
    if (path === '/verify-email' || path === '/confirm-email') {
      return '/verify-email' + qs;
    }
    if (path === '/verify-email-change') {
      return '/verify-email-change' + qs;
    }
    if (path === '/reset-password') {
      return '/reset-password' + qs;
    }
    if (path === '/child-login' || path === '/child-dashboard') {
      return path + qs;
    }
    if (path === '/login' || path === '/dashboard' || path === '/settings') {
      return path + qs;
    }
    return null;
  }

  function navigate(pathAndQuery) {
    var target = mapDeepPath(pathAndQuery);
    if (!target) return false;
    if (window.location.pathname + (window.location.search || '') === target) return true;
    window.location.href = target;
    return true;
  }

  function handleUrl(raw) {
    var normalized = normalizeIncomingUrl(raw);
    if (!normalized) return false;
    return navigate(normalized);
  }

  function initNativeAppListener() {
    if (typeof Platform === 'undefined' || !Platform.isNative || !Platform.isNative()) return;
    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins || !Capacitor.Plugins.App) return;
    Capacitor.Plugins.App.addListener('appUrlOpen', function (event) {
      if (event && event.url) handleUrl(event.url);
    }).catch(function () {});
    Capacitor.Plugins.App.getLaunchUrl().then(function (ret) {
      if (ret && ret.url) handleUrl(ret.url);
    }).catch(function () {});
  }

  /** Push notification tap — call from push-manager / native bridge. */
  function handlePushPayload(data) {
    if (!data) return;
    var url = data.url || data.path;
    if (url && handleUrl(url)) return;
    if (data.type === 'schedule_reminder') {
      window.location.href = '/schedule';
    }
  }

  window.DeepLinkRouter = {
    handleUrl: handleUrl,
    handlePushPayload: handlePushPayload,
    mapDeepPath: mapDeepPath,
    init: function () {
      initNativeAppListener();
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.DeepLinkRouter.init();
    });
  } else {
    window.DeepLinkRouter.init();
  }
})();
