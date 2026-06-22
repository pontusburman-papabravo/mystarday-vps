/**
 * app-entry-analytics.js — Entry flow product analytics (applandningssidan v2.1).
 * WHAT: trackEntry(event, props) → POST /api/analytics/event (whitelist in analytics.js).
 * WHAT NOT: auth, navigation — see app-entry.js.
 */
(function () {
  'use strict';

  var SESSION_KEY = 'analytics_session_nonce';

  function getOrCreateSessionNonce() {
    try {
      var existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      var nonce = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
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

  function track(eventName, props) {
    if (!eventName) return;
    var metadata = props && typeof props === 'object' ? Object.assign({}, props) : {};
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

  window.EntryAnalytics = {
    track: track,
    detectPlatform: detectPlatform,
    getOrCreateSessionNonce: getOrCreateSessionNonce,
  };
})();
