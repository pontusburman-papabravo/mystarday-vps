/**
 * app-view-mode.js — Magic är numera den enda förälder-vyn (ingen klassisk vy).
 * Den här modulen sköter därför två saker:
 *   1. Tvingar magic-vyn för föräldrar (ingen vyväxlare längre).
 *   2. Hanterar tema: mörk eller ljus bakgrund (server-synkat per konto).
 *
 * Barnvyn behåller sin egen per-barn-konfiguration (child_view_config).
 */
(function () {
  'use strict';

  var PARENT_KEY = 'stjarndag_parent_ui_view';
  var THEME_KEY = 'stjarndag_parent_theme';
  var childKey = function (id) { return 'stjarndag_child_ui_view_' + id; };

  var _role = null;
  var _childId = null;
  var _mode = 'classic';
  var _allowed = false;
  var _optimisticMagic = false;
  var _ready = false;
  var _listeners = [];
  var _themeListeners = [];
  // 'dark' | 'light' — parent background theme, persisted server-side.
  var _theme = 'dark';

  function persistChildDbMode(mode) {
    if (_role !== 'child' || !_childId || !_allowed) return;
    fetch('/api/children/' + _childId + '/view-config/self', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ view_mode: uiModeToDb(mode) }),
    }).catch(function () {});
  }

  function persistThemePreference(theme) {
    // Uses apiFetch when available (adds CSRF + credentials); falls back to a
    // plain fetch. Failure is non-blocking — localStorage keeps the choice.
    var body = JSON.stringify({ theme: normalizeTheme(theme) });
    if (typeof window.apiFetch === 'function') {
      window.apiFetch('/api/auth/me/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      }).catch(function () {});
      return;
    }
    fetch('/api/auth/me/theme', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    }).catch(function () {});
  }

  function normalize(mode) {
    return mode === 'magic' ? 'magic' : 'classic';
  }

  function normalizeTheme(theme) {
    return theme === 'light' ? 'light' : 'dark';
  }

  function dbModeToUi(viewMode) {
    return viewMode === 'new' ? 'magic' : 'classic';
  }

  function uiModeToDb(mode) {
    return mode === 'magic' ? 'new' : 'classic';
  }

  function readStorage(key) {
    try {
      var v = localStorage.getItem(key);
      if (v === 'magic' || v === 'classic') return v;
    } catch (_) {}
    return null;
  }

  function writeStorage(key, mode) {
    try {
      localStorage.setItem(key, normalize(mode));
    } catch (_) {}
  }

  function readStoredTheme() {
    try {
      var v = localStorage.getItem(THEME_KEY);
      if (v === 'light' || v === 'dark') return v;
    } catch (_) {}
    return null;
  }

  function writeStoredTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, normalizeTheme(theme));
    } catch (_) {}
  }

  function notify() {
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](_mode, _role); } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent('stjarndag-view-mode', { detail: { mode: _mode, role: _role, allowed: _allowed } }));
  }

  function notifyTheme() {
    for (var i = 0; i < _themeListeners.length; i++) {
      try { _themeListeners[i](_theme); } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent('stjarndag-theme', { detail: { theme: _theme } }));
  }

  function applyThemeClass() {
    if (!document.body) return;
    var light = _theme === 'light';
    document.body.classList.toggle('parent-theme-light', light);
    document.body.classList.toggle('parent-theme-dark', !light);
    document.documentElement.classList.toggle('parent-theme-light', light);
    document.documentElement.classList.toggle('parent-theme-dark', !light);
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', light ? '#ffffff' : '#07071a');
  }

  function applyBodyClasses() {
    var magic = _mode === 'magic' && (_allowed || _optimisticMagic);
    document.body.classList.toggle('parent-magic-view', _role === 'parent' && magic);
    if (_role === 'parent' && !magic) {
      document.body.classList.remove('parent-magic-dashboard');
    }
    document.body.classList.toggle('child-magic-view', _role === 'child' && magic);
    document.body.classList.toggle('child-has-bottom-nav', _role === 'child' && magic);
    if (_role === 'parent' && magic) {
      document.documentElement.classList.add('parent-magic-early');
    } else {
      document.documentElement.classList.remove('parent-magic-early');
    }
  }

  /** Apply magic + stored theme before /api/auth/me — avoids flash on navigation. */
  function applyStoredParentModeOptimistic() {
    if (!document.body) return false;
    _role = 'parent';
    _childId = null;
    _mode = 'magic';
    _optimisticMagic = true;
    var storedTheme = readStoredTheme();
    if (storedTheme) _theme = storedTheme;
    applyThemeClass();
    applyBodyClasses();
    if (window.ParentMagicShell && typeof ParentMagicShell.refresh === 'function') {
      try { ParentMagicShell.refresh(); } catch (_) {}
    }
    return true;
  }

  function setToggleVisible() {
    // The classic/magic view toggle has been removed — always hide its wrap.
    document.querySelectorAll('.app-view-toggle-wrap').forEach(function (el) {
      el.style.display = 'none';
    });
  }

  function updateToggleUi() {
    // No-op: the view toggle no longer exists. Kept for call-site compatibility.
  }

  function fetchAccess() {
    return fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        // Magic is the only parent view now, but children still honour the
        // server allowlist for their own magic view.
        _allowed = !!(data && data.magic_view_enabled);
        if (data && (data.theme_preference === 'light' || data.theme_preference === 'dark')) {
          _theme = data.theme_preference;
        }
        return _allowed;
      })
      .catch(function () {
        return _allowed;
      });
  }

  function finishInitParent() {
    _optimisticMagic = false;
    _allowed = true;
    _mode = 'magic';
    _ready = true;
    applyThemeClass();
    applyBodyClasses();
    setToggleVisible();
    notify();
    notifyTheme();
    return true;
  }

  function finishInitChild(dbUi) {
    _optimisticMagic = false;
    _mode = _allowed ? normalize(dbUi || 'classic') : 'classic';
    _ready = true;
    applyBodyClasses();
    setToggleVisible();
    notify();
    return _allowed;
  }

  function initParent() {
    _role = 'parent';
    _childId = null;
    _allowed = true;
    _mode = 'magic';
    _optimisticMagic = true;
    var storedTheme = readStoredTheme();
    if (storedTheme) _theme = storedTheme;
    applyThemeClass();
    applyBodyClasses();
    return fetchAccess().then(function () {
      _allowed = true; // magic-only for parents regardless of allowlist
      var result = finishInitParent();
      // Mirror the resolved theme into localStorage so the next load's
      // pre-paint matches what the server returns (no flash).
      writeStoredTheme(_theme);
      writeStorage(PARENT_KEY, 'magic');
      return result;
    });
  }

  function initChild(childId, dbViewMode) {
    _role = 'child';
    _childId = childId;
    var dbUi = dbModeToUi(dbViewMode || 'classic');
    return fetchAccess().then(function () {
      if (_allowed && childId) {
        writeStorage(childKey(childId), dbUi);
      }
      return finishInitChild(dbUi);
    });
  }

  function isAllowed() {
    return _allowed;
  }

  function isReady() {
    return _ready;
  }

  function getMode() {
    return _mode;
  }

  function isMagic() {
    if (_role === 'parent') return true;
    return _mode === 'magic' && (_allowed || _optimisticMagic);
  }

  function isClassic() {
    return !isMagic();
  }

  // ── Theme (dark / light background) ──
  function getTheme() {
    return _theme;
  }

  function setTheme(theme) {
    theme = normalizeTheme(theme);
    if (theme === _theme) {
      applyThemeClass();
      return _theme;
    }
    _theme = theme;
    writeStoredTheme(theme);
    applyThemeClass();
    persistThemePreference(theme);
    notifyTheme();
    return _theme;
  }

  function toggleTheme() {
    return setTheme(_theme === 'light' ? 'dark' : 'light');
  }

  function onThemeChange(fn) {
    if (typeof fn === 'function') _themeListeners.push(fn);
  }

  function setMode(mode) {
    // Parents are magic-only; ignore attempts to switch to classic.
    if (_role === 'parent') {
      _mode = 'magic';
      applyBodyClasses();
      return _mode;
    }
    if (!_allowed) {
      _mode = 'classic';
      applyBodyClasses();
      return _mode;
    }
    mode = normalize(mode);
    _mode = mode;
    if (_role === 'child' && _childId) {
      writeStorage(childKey(_childId), mode);
      persistChildDbMode(mode);
    }
    applyBodyClasses();
    notify();
    return _mode;
  }

  function toggle() {
    // View toggle removed for parents. For children, keep legacy behaviour.
    if (_role === 'parent') return 'magic';
    if (!_allowed) return 'classic';
    return setMode(_mode === 'magic' ? 'classic' : 'magic');
  }

  function onChange(fn) {
    if (typeof fn === 'function') _listeners.push(fn);
  }

  function mountToggle(container) {
    // The classic/magic view toggle has been removed entirely.
    if (container) container.innerHTML = '';
  }

  window.AppViewMode = {
    initParent: initParent,
    initChild: initChild,
    isAllowed: isAllowed,
    isReady: isReady,
    getMode: getMode,
    isMagic: isMagic,
    isClassic: isClassic,
    setMode: setMode,
    toggle: toggle,
    onChange: onChange,
    mountToggle: mountToggle,
    applyStoredParentModeOptimistic: applyStoredParentModeOptimistic,
    uiModeToDb: uiModeToDb,
    dbModeToUi: dbModeToUi,
    // Theme API
    getTheme: getTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    onThemeChange: onThemeChange,
  };

  // Apply stored theme as early as possible to avoid a flash.
  if (document.body) {
    var t = readStoredTheme();
    if (t) { _theme = t; applyThemeClass(); }
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      var t2 = readStoredTheme();
      if (t2) { _theme = t2; applyThemeClass(); }
    });
  }

  // Re-assert the theme (body/html classes + theme-color meta) after each magic
  // soft-navigation. The router preserves the theme class on <body>, but the new
  // page's <meta theme-color> would otherwise keep its static default.
  window.addEventListener('stjarndag-magic-navigated', function () {
    applyThemeClass();
  });
})();
