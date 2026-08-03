/**
 * utm-capture.js — persist ad attribution (?utm_* + platform + locale) until signup.
 * First-touch, 30-day TTL. No PII. No raw URLs. No click tokens stored.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'msd_utm_attribution';
  const TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const MAX_LEN = {
    utm_source: 64,
    utm_medium: 64,
    utm_campaign: 128,
    utm_content: 128,
    utm_term: 128,
    landing_locale: 16,
    platform: 32,
  };

  function readFromUrl() {
    try {
      return new URLSearchParams(window.location.search);
    } catch (_) {
      return null;
    }
  }

  function trim(val, max) {
    if (typeof val !== 'string') return '';
    const s = val.trim();
    return s.length > max ? s.slice(0, max) : s;
  }

  function detectPlatform() {
    try {
      if (window.Platform) {
        if (Platform.isIOS && Platform.isIOS()) return 'ios';
        if (Platform.isAndroid && Platform.isAndroid()) return 'android';
        if (Platform.isNative && Platform.isNative()) return 'ios';
      }
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        return 'pwa';
      }
      if (window.navigator && window.navigator.standalone === true) return 'pwa';
    } catch (_) {}
    return 'web';
  }

  function detectLocale() {
    try {
      const path = (window.location.pathname || '').toLowerCase();
      if (path === '/en' || path.indexOf('/en/') === 0) return 'en-GB';
      const htmlLang = (document.documentElement && document.documentElement.lang) || '';
      if (htmlLang.toLowerCase().indexOf('en') === 0) return 'en-GB';
    } catch (_) {}
    return 'sv-SE';
  }

  function capture() {
    const params = readFromUrl();
    const incoming = {};

    if (params) {
      PARAMS.forEach(function (key) {
        const val = params.get(key);
        if (!val) return;
        // Drop URL-like or secret-like values client-side
        if (/https?:\/\//i.test(val) || /token|secret|password|bearer/i.test(val)) return;
        incoming[key] = trim(val, MAX_LEN[key] || 64);
      });
    }

    // Always refresh platform/locale on visit (non-campaign context)
    incoming.platform = detectPlatform();
    incoming.landing_locale = detectLocale();

    try {
      const existing = getRaw();
      const merged = Object.assign({}, existing || {});
      // First-touch for utm_*: do not overwrite existing campaign fields
      PARAMS.forEach(function (key) {
        if (incoming[key] && !merged[key]) merged[key] = incoming[key];
      });
      if (!merged.platform) merged.platform = incoming.platform;
      if (!merged.landing_locale) merged.landing_locale = incoming.landing_locale;
      if (!merged.captured_at) merged.captured_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (_) {}
  }

  function getRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function get() {
    const data = getRaw();
    if (!data) return null;
    if (data.captured_at) {
      const age = Date.now() - new Date(data.captured_at).getTime();
      if (age > TTL_MS) {
        clear();
        return null;
      }
    }
    const out = {};
    PARAMS.forEach(function (key) {
      if (data[key]) out[key] = data[key];
    });
    if (data.platform) out.platform = data.platform;
    if (data.landing_locale) out.landing_locale = data.landing_locale;
    if (data.captured_at) out.first_touch_at = data.captured_at;
    return Object.keys(out).length ? out : null;
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  /** Payload for register / oauth / POST /api/account/attribution */
  function toRegisterFields() {
    const data = get() || {};
    return {
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
      utm_content: data.utm_content,
      utm_term: data.utm_term,
      platform: data.platform || detectPlatform(),
      landing_locale: data.landing_locale || detectLocale(),
      first_touch_at: data.first_touch_at,
    };
  }

  capture();

  window.UtmCapture = {
    get: get,
    clear: clear,
    capture: capture,
    toRegisterFields: toRegisterFields,
    detectPlatform: detectPlatform,
  };
})();
