/**
 * deep-link-router.js — Sprint 22b: native deep links + push-tap URLs.
 */
(function () {
  'use strict';

  const LAUNCH_URL_CONSUMED_KEY = 'stjarndag_launch_url_consumed_v1';

  function normalizeIncomingUrl(raw) {
    if (!raw) return null;
    try {
      const u = new URL(raw, window.location.origin);
      return u.pathname + (u.search || '');
    } catch (_) {
      if (raw.charAt(0) === '/') return raw;
      return null;
    }
  }

  /**
   * Map mystarday.se paths → in-app routes (WebView).
   */
  function isNativeApp() {
    return typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative();
  }

  function isChildAppPath(pathAndQuery) {
    if (!pathAndQuery) return false;
    const path = pathAndQuery.split('?')[0].replace(/\/$/, '') || '/';
    return path === '/child-login' || path === '/child-dashboard' || path.indexOf('/child/') === 0;
  }

  /** Widget taps must not force parents into child PIN routes (POS widget contract). */
  function parentDestinationForWidgetDeepLink(pathAndQuery) {
    const raw = pathAndQuery || '';
    if (raw.indexOf('from_widget=1') >= 0 || raw.indexOf('widgetSettingsSection') >= 0) {
      return '/settings?from_widget=1#widgetSettingsSection';
    }
    return '/dashboard';
  }

  function remapWidgetChildDeepLink(pathAndQuery) {
    if (!isNativeApp() || !isChildAppPath(pathAndQuery)) return pathAndQuery;
    const user = window.Auth && typeof Auth.getUser === 'function' ? Auth.getUser() : null;
    const parentSession = user && user.type === 'parent';
    const widgetIntent =
      (pathAndQuery || '').indexOf('from_widget') >= 0
      || (pathAndQuery || '').indexOf('widget') >= 0;
    if (parentSession || widgetIntent) {
      return parentDestinationForWidgetDeepLink(pathAndQuery);
    }
    return pathAndQuery;
  }

  function launchUrlFingerprint(raw) {
    const normalized = normalizeIncomingUrl(raw);
    return normalized || String(raw || '');
  }

  function mapDeepPath(pathAndQuery) {
    if (!pathAndQuery) return null;
    const path = pathAndQuery.split('?')[0].replace(/\/$/, '') || '/';
    const qs = pathAndQuery.indexOf('?') >= 0 ? pathAndQuery.slice(pathAndQuery.indexOf('?')) : '';

    if (path === '/invite' || path.indexOf('/invite/') === 0) {
      const inviteToken = path.split('/')[2] || new URLSearchParams(qs).get('token');
      return inviteToken
        ? '/accept-invite?token=' + encodeURIComponent(inviteToken)
        : '/accept-invite' + qs;
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
    if (path === '/child-login' || path === '/child-dashboard' || path.indexOf('/child/') === 0) {
      if (path === '/child-dashboard') return '/child/today' + qs;
      return path + qs;
    }
    if (path === '/login' || path === '/dashboard' || path === '/settings') {
      return path + qs;
    }
    if (path.indexOf('/family/child/') === 0) {
      return path + qs;
    }
    if (path === '/family') {
      return path + qs;
    }
    if (path === '/planning' || path === '/rewards') {
      return path + qs;
    }
    return null;
  }

  function navigate(pathAndQuery) {
    const remapped = remapWidgetChildDeepLink(pathAndQuery);
    const target = mapDeepPath(remapped);
    if (!target) return false;
    const current = window.location.pathname + (window.location.search || '') + (window.location.hash || '');
    if (current === target || window.location.pathname + (window.location.search || '') === target) {
      return true;
    }
    window.location.href = target;
    return true;
  }

  function handleUrl(raw, options) {
    options = options || {};
    const normalized = normalizeIncomingUrl(raw);
    if (!normalized) return false;
    if (options.fromColdLaunch) {
      try {
        const fp = launchUrlFingerprint(raw);
        if (sessionStorage.getItem(LAUNCH_URL_CONSUMED_KEY) === fp) {
          return false;
        }
        sessionStorage.setItem(LAUNCH_URL_CONSUMED_KEY, fp);
      } catch (_) { /* ignore */ }
    }
    return navigate(normalized);
  }

  function getAppPlugin() {
    if (typeof Capacitor === 'undefined') return null;
    if (Capacitor.Plugins && Capacitor.Plugins.App) return Capacitor.Plugins.App;
    if (typeof Capacitor.getPlugin === 'function') {
      try {
        return Capacitor.getPlugin('App');
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  function initNativeAppListener() {
    if (window.__deepLinkRouterInited) return;
    if (typeof Platform === 'undefined' || !Platform.isNative || !Platform.isNative()) return;
    const App = getAppPlugin();
    if (!App) return;
    window.__deepLinkRouterInited = true;
    if (typeof App.addListener === 'function') {
      try {
        App.addListener('appUrlOpen', function (event) {
          if (event && event.url) handleUrl(event.url);
        });
      } catch (_) {}
    }
    if (typeof App.getLaunchUrl === 'function') {
      App.getLaunchUrl().then(function (ret) {
        if (ret && ret.url) handleUrl(ret.url, { fromColdLaunch: true });
      }).catch(function () {});
    }
  }

  /** Push notification tap — call from push-manager / native bridge. */
  function handlePushPayload(data) {
    if (!data) return;
    const url = data.url || data.path;
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
