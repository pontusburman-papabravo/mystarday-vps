/**
 * app-entry-analytics.js — Entry flow product analytics (applandningssidan v2.1).
 * WHAT: trackEntry(event, props) → POST /api/analytics/event (whitelist in analytics.js).
 * WHAT NOT: auth, navigation — see app-entry.js.
 */
(function () {
  'use strict';

  const SESSION_KEY = 'analytics_session_nonce';

  function getOrCreateSessionNonce() {
    try {
      const existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const nonce = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEY, nonce);
      return nonce;
    } catch (_) {
      return 'anon_' + Date.now();
    }
  }

  function detectPlatform() {
    if (typeof window.Platform !== 'undefined') {
      if (typeof Platform.isNative === 'function' && Platform.isNative()) {
        if (typeof Platform.isIOS === 'function' && Platform.isIOS()) return 'ios';
        if (typeof Platform.isAndroid === 'function' && Platform.isAndroid()) return 'android';
        return 'native';
      }
    }
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return 'pwa';
    } catch (_) { /* ignore */ }
    return 'web';
  }

  function currentLocale() {
    try {
      if (window.I18n && typeof I18n.getCurrentLang === 'function') {
        const lang = I18n.getCurrentLang();
        if (lang) return lang;
      }
    } catch (_) { /* ignore */ }
    try {
      return (document.documentElement && document.documentElement.lang) || null;
    } catch (_) {
      return null;
    }
  }

  /**
   * entry_source is taken from the navigation query. A plain /login visit is
   * not labeled as a cold start.
   */
  function entrySourceFromLocation() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const src = params.get('src');
      if (src === 'cold_start') return 'native_cold_start';
      if (src === 'auth_me_5xx' || src === 'auth_me_timeout' || src === 'auth_me_error' || src === 'auth_failsafe') {
        return 'native_auth_failsafe';
      }
      if (params.get('entry') === 'native_first_run') return 'native_login';
    } catch (_) { /* ignore */ }
    return null;
  }

  function acquisitionMeta(extra) {
    const meta = extra && typeof extra === 'object' ? Object.assign({}, extra) : {};
    const platform = detectPlatform();
    if (platform === 'ios' || platform === 'android') meta.platform = platform;
    const locale = currentLocale();
    if (locale) meta.locale = locale;
    if (!meta.entry_source) {
      const source = entrySourceFromLocation();
      if (source) meta.entry_source = source;
    }
    return meta;
  }

  function registerHrefFromEntry() {
    let src = 'login';
    try {
      const current = new URLSearchParams(window.location.search || '').get('src');
      if (current === 'cold_start' || current === 'auth_me_5xx' || current === 'auth_me_timeout' || current === 'auth_me_error' || current === 'auth_failsafe') {
        src = current;
      }
    } catch (_) { /* ignore */ }
    return '/register?entry=native_first_run&src=' + encodeURIComponent(src);
  }

  function track(eventName, props) {
    if (!eventName) return;
    const metadata = props && typeof props === 'object' ? Object.assign({}, props) : {};
    metadata.entry_version = metadata.entry_version || 'v2_1';
    metadata.platform = metadata.platform || detectPlatform();
    try {
      metadata.entry_path = metadata.entry_path || sessionStorage.getItem('entry_path') || null;
    } catch (_) { /* ignore */ }

    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event_type: eventName,
          metadata: metadata,
          session_id: getOrCreateSessionNonce(),
        }),
      }).catch(function () {});
    } catch (_) { /* silent */ }
  }

  function maybeTrackRegisterViewed() {
    try {
      const path = (window.location.pathname || '').replace(/\/$/, '') || '/';
      if (path !== '/register') return;
      track('register_viewed', acquisitionMeta());
    } catch (_) { /* analytics never blocks registration */ }
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', maybeTrackRegisterViewed);
    } else {
      maybeTrackRegisterViewed();
    }
  }

  window.EntryAnalytics = {
    track: track,
    detectPlatform: detectPlatform,
    getOrCreateSessionNonce: getOrCreateSessionNonce,
    acquisitionMeta: acquisitionMeta,
    registerHrefFromEntry: registerHrefFromEntry,
    trackSignupCompleted: function (method) {
      try {
        const meta = acquisitionMeta();
        if (method === 'email' || method === 'apple' || method === 'google') meta.method = method;
        track('signup_completed', meta);
      } catch (_) { /* analytics never blocks registration */ }
    },
  };
})();
