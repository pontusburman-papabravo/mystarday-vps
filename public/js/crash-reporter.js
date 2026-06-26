/**
 * crash-reporter.js — Sprint 14 observability (Sentry browser i WebView).
 * Init endast om GET /api/app-config returnerar sentryDsn. Ingen PII i breadcrumbs.
 */
(function () {
  'use strict';

  let _inited = false;

  function sanitize(value) {
    if (value == null) return value;
    const s = String(value);
    if (s.indexOf('@') !== -1) return '[redacted-email]';
    if (/^[0-9a-f-]{36}$/i.test(s)) return '[redacted-uuid]';
    return s.length > 120 ? s.slice(0, 120) + '…' : s;
  }

  function loadSentry(dsn, release) {
    if (_inited || !dsn) return;
    const script = document.createElement('script');
    script.src = 'https://browser.sentry-cdn.com/8.55.0/bundle.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = function () {
      if (!window.Sentry) return;
      window.Sentry.init({
        dsn: dsn,
        release: release || 'stjarndag@unknown',
        environment: typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative() ? 'native' : 'web',
        beforeBreadcrumb: function (b) {
          if (b.data) {
            Object.keys(b.data).forEach(function (k) {
              b.data[k] = sanitize(b.data[k]);
            });
          }
          return b;
        },
      });
      _inited = true;
    };
    document.head.appendChild(script);
  }

  function init() {
    fetch('/api/app-config', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (cfg && cfg.sentryDsn) {
          loadSentry(cfg.sentryDsn, cfg.release);
        }
      })
      .catch(function () {});
  }

  window.CrashReporter = {
    init: init,
    testCrash: function () {
      throw new Error('Stjärndag test crash (sprint 14)');
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
