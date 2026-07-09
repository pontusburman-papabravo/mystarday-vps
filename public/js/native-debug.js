/**
 * native-debug.js — On-screen diagnostics for Capacitor (Android/iOS).
 * Shows lifecycle steps, fetch results, and JS errors before a WebView crash.
 *
 * Enable:
 *   - Server: NATIVE_DEBUG_OVERLAY=true → app-config.native_debug_overlay
 *   - URL once: ?native_debug=1 (persisted in sessionStorage)
 *   - Secret: 7 taps on login title (persisted in localStorage)
 */
(function () {
  'use strict';

  const CHANNEL = 'native_debug';
  const MAX_LINES = 100;
  const lines = [];
  let enabled = false;
  let panel = null;
  let listEl = null;
  let collapsed = false;

  function isNativeShell() {
    if (document.documentElement.classList.contains('is-native')) return true;
    return typeof window.Platform !== 'undefined' &&
      typeof Platform.isNative === 'function' &&
      Platform.isNative();
  }

  function platformSnapshot() {
    const snap = {
      path: typeof location !== 'undefined' ? location.pathname : '',
      android: document.documentElement.classList.contains('is-native-android'),
      ios: document.documentElement.classList.contains('is-native-ios'),
    };
    if (typeof Platform !== 'undefined') {
      snap.platformJs = {
        native: !!(Platform.isNative && Platform.isNative()),
        android: !!(Platform.isAndroid && Platform.isAndroid()),
        ios: !!(Platform.isIOS && Platform.isIOS()),
      };
    }
    if (typeof Auth !== 'undefined') {
      snap.auth = {
        loggedIn: !!(Auth.isLoggedIn && Auth.isLoggedIn()),
        type: Auth.getUser && Auth.getUser() ? Auth.getUser().type : null,
      };
    }
    return snap;
  }

  function persistEnabled() {
    try { sessionStorage.setItem('stjarndag_native_debug', '1'); } catch (_) {}
  }

  function persistEnabledLong() {
    try { localStorage.setItem('stjarndag_native_debug', '1'); } catch (_) {}
    persistEnabled();
  }

  function shouldEnableFromUrl() {
    try {
      return /(?:\?|&)native_debug=1(?:&|$)/.test(location.search || '');
    } catch (_) {
      return false;
    }
  }

  function readStoredEnable() {
    try {
      if (localStorage.getItem('stjarndag_native_debug') === '1') return true;
      if (sessionStorage.getItem('stjarndag_native_debug') === '1') return true;
    } catch (_) {}
    return false;
  }

  function serverLog(step, detail) {
    const payload = {
      channel: CHANNEL,
      step: step,
      detail: detail || null,
      ts: Date.now(),
      native: isNativeShell(),
      android: document.documentElement.classList.contains('is-native-android'),
      ios: document.documentElement.classList.contains('is-native-ios'),
    };
    try {
      fetch('/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {});
    } catch (_) {}
  }

  function renderPanel() {
    if (!listEl) return;
    listEl.textContent = lines.join('\n');
    listEl.scrollTop = listEl.scrollHeight;
  }

  function ensurePanel() {
    if (panel) return;
    panel = document.createElement('div');
    panel.id = 'nativeDebugPanel';
    panel.setAttribute('role', 'log');
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML =
      '<div id="nativeDebugHeader">' +
      '<strong>Native debug</strong>' +
      '<span id="nativeDebugActions">' +
      '<button type="button" id="nativeDebugCollapse" aria-label="Minimera">−</button>' +
      '<button type="button" id="nativeDebugCopy" aria-label="Kopiera logg">Kopiera</button>' +
      '</span></div>' +
      '<pre id="nativeDebugList"></pre>';
    document.body.appendChild(panel);
    listEl = document.getElementById('nativeDebugList');
    document.getElementById('nativeDebugCollapse').addEventListener('click', function () {
      collapsed = !collapsed;
      panel.classList.toggle('is-collapsed', collapsed);
      this.textContent = collapsed ? '+' : '−';
    });
    document.getElementById('nativeDebugCopy').addEventListener('click', function () {
      const text = lines.join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
      }
    });
  }

  function log(step, detail) {
    if (!enabled) return;
    const ts = new Date().toISOString().slice(11, 23);
    let extra = '';
    if (detail != null) {
      try { extra = ' ' + JSON.stringify(detail); } catch (_) { extra = ' [detail]'; }
    }
    const line = ts + ' ' + step + extra;
    lines.push(line);
    if (lines.length > MAX_LINES) lines.shift();
    console.log('[NATIVE-DEBUG]', step, detail || '');
    serverLog(step, detail);
    if (panel) renderPanel();
  }

  function enable(reason) {
    if (enabled) return;
    enabled = true;
    persistEnabled();
    if (document.body) ensurePanel();
    log('debug_enabled', { reason: reason || 'unknown', snap: platformSnapshot() });
    hookFetch();
    hookLifecycle();
  }

  function hookFetch() {
    if (window.__nativeDebugFetchHooked) return;
    window.__nativeDebugFetchHooked = true;
    const orig = window.fetch;
    if (typeof orig !== 'function') return;
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const isApi = url.indexOf('/api/') !== -1;
      return orig.apply(this, arguments).then(function (res) {
        if (enabled && isApi) {
          log('fetch_ok', { url: url.slice(0, 120), status: res.status });
        }
        return res;
      }).catch(function (err) {
        if (enabled && isApi) {
          log('fetch_fail', { url: url.slice(0, 120), err: String(err && err.message || err) });
        }
        throw err;
      });
    };
  }

  function hookLifecycle() {
    if (window.__nativeDebugLifecycleHooked) return;
    window.__nativeDebugLifecycleHooked = true;
    window.addEventListener('error', function (ev) {
      log('window_error', {
        message: ev.message,
        source: ev.filename,
        line: ev.lineno,
        col: ev.colno,
      });
    });
    window.addEventListener('unhandledrejection', function (ev) {
      log('unhandled_rejection', { reason: String(ev.reason && ev.reason.message || ev.reason) });
    });
    window.addEventListener('beforeunload', function () {
      log('beforeunload', platformSnapshot());
    });
    document.addEventListener('visibilitychange', function () {
      log('visibility', { state: document.visibilityState, snap: platformSnapshot() });
    });
    window.addEventListener('stjarndag-view-mode', function (ev) {
      log('view_mode', ev.detail || null);
    });
    window.addEventListener('stjarndag-parent-nav-layout', function () {
      log('parent_nav_layout', platformSnapshot());
    });
    window.addEventListener('stjarndag-magic-navigated', function (ev) {
      log('magic_navigated', ev.detail || null);
    });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        log('dom_ready', platformSnapshot());
      });
    } else {
      log('dom_ready', platformSnapshot());
    }
    window.addEventListener('pageshow', function (ev) {
      log('pageshow', { persisted: !!ev.persisted, snap: platformSnapshot() });
    });
  }

  function bindSecretActivator() {
    const path = (location.pathname || '').replace(/\/$/, '') || '/';
    if (path !== '/login' && path !== '/app-entry') return;
    const targets = [
      document.querySelector('.login-magic-title'),
      document.querySelector('.app-entry-title'),
      document.querySelector('h1'),
    ].filter(Boolean);
    if (!targets.length) return;
    if (targets[0].dataset.nativeDebugTapBound) return;
    targets[0].dataset.nativeDebugTapBound = '1';
    let taps = 0;
    let timer = null;
    targets[0].addEventListener('click', function () {
      taps += 1;
      clearTimeout(timer);
      timer = setTimeout(function () { taps = 0; }, 2000);
      if (taps >= 7) {
        taps = 0;
        persistEnabledLong();
        enable('secret_tap');
      }
    });
  }

  function tryEnableFromConfig() {
    if (shouldEnableFromUrl()) {
      enable('url_param');
      return true;
    }
    if (readStoredEnable()) {
      enable('stored');
      return true;
    }
    return false;
  }

  function fetchConfigAndEnable() {
    fetch('/api/app-config', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) {
        if (cfg && cfg.native_debug_overlay) enable('app_config');
      })
      .catch(function () {});
  }

  function boot() {
    bindSecretActivator();

    if (!isNativeShell()) {
      let attempts = 0;
      const timer = setInterval(function () {
        attempts += 1;
        if (isNativeShell()) {
          clearInterval(timer);
          if (!tryEnableFromConfig()) fetchConfigAndEnable();
        } else if (attempts >= 30) {
          clearInterval(timer);
        }
      }, 100);
      return;
    }

    if (tryEnableFromConfig()) return;
    fetchConfigAndEnable();
  }

  window.NativeDebug = {
    log: log,
    enable: enable,
    isEnabled: function () { return enabled; },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
