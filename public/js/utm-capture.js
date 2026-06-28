/**
 * utm-capture.js — persist ad attribution (?utm_* + fbclid) until signup.
 * First-touch, 30-day TTL. No PII.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'msd_utm_attribution';
  const TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

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

  function capture() {
    const params = readFromUrl();
    if (!params) return;

    const incoming = {};
    let hasIncoming = false;
    PARAMS.forEach(function (key) {
      const val = params.get(key);
      if (!val) return;
      incoming[key] = trim(val, 255);
      hasIncoming = true;
    });
    if (!hasIncoming) return;

    try {
      const existing = getRaw();
      const merged = Object.assign({}, existing || {}, incoming, {
        captured_at: new Date().toISOString(),
      });
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
    return Object.keys(out).length ? out : null;
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  capture();

  window.UtmCapture = {
    get: get,
    clear: clear,
    capture: capture,
  };
})();
