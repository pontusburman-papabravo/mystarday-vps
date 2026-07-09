/**
 * native-debug.js — On-screen diagnostics for Capacitor (Android/iOS).
 * Persists log to localStorage so crash logs survive app restart.
 */
(function () {
  'use strict';

  if (window.__stjarndagNativeDebugLoaded) return;
  window.__stjarndagNativeDebugLoaded = true;

  const LOG_KEY = 'stjarndag_native_debug_log';
  const LOG_TS_KEY = 'stjarndag_native_debug_log_ts';
  const MAX_LINES = 200;
  const lines = [];
  let enabled = false;
  let panel = null;
  let listEl = null;
  let headerEl = null;
  let collapsed = true;
  let lastServerMs = 0;

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

  function persistLinesToStorage() {
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(lines.slice(-MAX_LINES)));
      localStorage.setItem(LOG_TS_KEY, new Date().toISOString().slice(0, 19));
    } catch (_) {}
  }

  function loadPersistedLog() {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return false;
      const stamp = localStorage.getItem(LOG_TS_KEY) || '?';
      lines.push('════ föregående körning ' + stamp + ' ════');
      parsed.forEach(function (l) { lines.push(l); });
      lines.push('════ ny session ════');
      return true;
    } catch (_) {
      return false;
    }
  }

  function serverLogMilestone(step, detail) {
    const critical = /^(debug_enabled|login_redirect|dashboard_|window_error|unhandled|fetch_error|navigate|beforeunload|session_)/.test(step);
    if (!critical) return;
    if (detail && detail.url && String(detail.url).indexOf('/api/analytics') !== -1) return;
    const now = Date.now();
    if (now - lastServerMs < 1500) return;
    lastServerMs = now;
    try {
      fetch('/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          channel: 'native_debug',
          step: step,
          detail: detail || null,
          ts: now,
          native: true,
          android: document.documentElement.classList.contains('is-native-android'),
        }),
        keepalive: true,
      }).catch(function () {});
    } catch (_) {}
  }

  function updateHeader() {
    if (!headerEl) return;
    const n = lines.length;
    headerEl.textContent = n ? 'Native debug · ' + n + ' rader' : 'Native debug · väntar…';
  }

  function renderPanel() {
    if (!listEl) return;
    listEl.textContent = lines.join('\n');
    listEl.scrollTop = listEl.scrollHeight;
    updateHeader();
  }

  function ensurePanel() {
    if (panel) return;
    panel = document.getElementById('nativeDebugPanel');
    if (panel) {
      listEl = panel.querySelector('#nativeDebugList');
      headerEl = panel.querySelector('#nativeDebugHeader strong');
      return;
    }
    panel = document.createElement('div');
    panel.id = 'nativeDebugPanel';
    panel.setAttribute('role', 'log');
    panel.setAttribute('aria-live', 'polite');
    panel.classList.toggle('is-collapsed', collapsed);
    panel.innerHTML =
      '<div id="nativeDebugHeader">' +
      '<strong>Native debug</strong>' +
      '<span id="nativeDebugActions">' +
      '<button type="button" id="nativeDebugCollapse" aria-label="Visa eller dölj logg">' +
      (collapsed ? '+' : '−') +
      '</button>' +
      '<button type="button" id="nativeDebugCopy" aria-label="Kopiera logg">Kopiera</button>' +
      '</span></div>' +
      '<pre id="nativeDebugList"></pre>';
    document.body.appendChild(panel);
    listEl = panel.querySelector('#nativeDebugList');
    headerEl = panel.querySelector('#nativeDebugHeader strong');
    panel.querySelector('#nativeDebugCollapse').addEventListener('click', function () {
      collapsed = !collapsed;
      panel.classList.toggle('is-collapsed', collapsed);
      this.textContent = collapsed ? '+' : '−';
    });
    panel.querySelector('#nativeDebugCopy').addEventListener('click', function () {
      const text = lines.join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          headerEl.textContent = 'Kopierad!';
          setTimeout(updateHeader, 1500);
        }).catch(function () {});
      }
    });
    updateHeader();
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
    persistLinesToStorage();
    serverLogMilestone(step, detail);
    if (!panel && document.body) ensurePanel();
    if (panel) renderPanel();
  }

  function shouldLogFetch(url, status) {
    if (url.indexOf('/api/client-log') !== -1) return false;
    if (url.indexOf('/api/analytics') !== -1) return false;
    if (status >= 400) return true;
    return /\/api\/auth\/(login|me|refresh|csrf-token)|\/api\/app-config|\/api\/family\//.test(url);
  }

  function hookUiClicks() {
    if (window.__nativeDebugUiHooked) return;
    window.__nativeDebugUiHooked = true;
    document.addEventListener('click', function (e) {
      if (!enabled) return;
      const el = e.target.closest('button, a[href], [role="button"]');
      if (!el || el.closest('#nativeDebugPanel')) return;
      const id = el.id || '';
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48);
      log('ui_click', { id: id, text: text });
    }, true);
  }

  function hookNavigation() {
    if (window.__nativeDebugNavHooked) return;
    window.__nativeDebugNavHooked = true;
    const origAssign = location.assign.bind(location);
    const origReplace = location.replace.bind(location);
    location.assign = function (url) {
      if (window.NativeDebug && NativeDebug.isEnabled()) {
        NativeDebug.log('navigate', { method: 'assign', to: String(url).slice(0, 120) });
      }
      return origAssign(url);
    };
    location.replace = function (url) {
      if (window.NativeDebug && NativeDebug.isEnabled()) {
        NativeDebug.log('navigate', { method: 'replace', to: String(url).slice(0, 120) });
      }
      return origReplace(url);
    };
  }

  function enable(reason) {
    if (enabled) return;
    enabled = true;
    collapsed = true;
    const hadCrashLog = loadPersistedLog();
    if (hadCrashLog) collapsed = false;
    persistEnabled();
    if (document.body) ensurePanel();
    if (hadCrashLog && panel) {
      panel.classList.remove('is-collapsed');
      const btn = panel.querySelector('#nativeDebugCollapse');
      if (btn) btn.textContent = '−';
    }
    log('debug_enabled', { reason: reason || 'unknown', snap: platformSnapshot() });
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn()) {
      log('session_already_logged_in', platformSnapshot());
    }
    hookFetch();
    hookLifecycle();
    hookUiClicks();
    hookNavigation();
  }

  function hookFetch() {
    if (window.__nativeDebugFetchHooked) return;
    window.__nativeDebugFetchHooked = true;
    const orig = window.fetch;
    if (typeof orig !== 'function') return;
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      return orig.apply(this, arguments).then(function (res) {
        if (window.NativeDebug && NativeDebug.isEnabled() &&
            url.indexOf('/api/') !== -1 && shouldLogFetch(url, res.status)) {
          NativeDebug.log(res.status >= 400 ? 'fetch_error' : 'fetch_ok', {
            url: url.slice(0, 120),
            status: res.status,
          });
        }
        return res;
      }).catch(function (err) {
        if (window.NativeDebug && NativeDebug.isEnabled() &&
            url.indexOf('/api/') !== -1 && url.indexOf('/api/client-log') === -1) {
          NativeDebug.log('fetch_fail', {
            url: url.slice(0, 120),
            err: String(err && err.message || err),
          });
        }
        throw err;
      });
    };
  }

  function hookLifecycle() {
    if (window.__nativeDebugLifecycleHooked) return;
    window.__nativeDebugLifecycleHooked = true;
    window.addEventListener('error', function (ev) {
      if (window.NativeDebug) {
        NativeDebug.log('window_error', {
          message: ev.message,
          source: ev.filename,
          line: ev.lineno,
          col: ev.colno,
        });
      }
    });
    window.addEventListener('unhandledrejection', function (ev) {
      if (window.NativeDebug) {
        NativeDebug.log('unhandled_rejection', {
          reason: String(ev.reason && ev.reason.message || ev.reason),
        });
      }
    });
    window.addEventListener('beforeunload', function () {
      if (window.NativeDebug) NativeDebug.log('beforeunload', platformSnapshot());
    });
    window.addEventListener('pagehide', function () {
      persistLinesToStorage();
    });
    window.addEventListener('stjarndag-view-mode', function (ev) {
      if (window.NativeDebug) NativeDebug.log('view_mode', ev.detail || null);
    });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        if (window.NativeDebug && NativeDebug.isEnabled()) {
          NativeDebug.log('dom_ready', platformSnapshot());
        }
      });
    } else if (window.NativeDebug && NativeDebug.isEnabled()) {
      log('dom_ready', platformSnapshot());
    }
    window.addEventListener('pageshow', function (ev) {
      if (window.NativeDebug) {
        NativeDebug.log('pageshow', { persisted: !!ev.persisted, snap: platformSnapshot() });
      }
    });
  }

  function bindSecretActivator() {
    const path = (location.pathname || '').replace(/\/$/, '') || '/';
    if (path !== '/login' && path !== '/app-entry') return;
    const targets = [
      document.querySelector('.login-magic-logo h1'),
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
    getLogText: function () { return lines.join('\n'); },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
