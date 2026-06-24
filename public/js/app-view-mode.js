/**
 * app-view-mode.js — Växla mellan klassisk vy och mockup/redesign (magic).
 * Tillgång styrs server-side via /api/auth/me → magic_view_enabled.
 */
(function () {
  'use strict';

  var PARENT_KEY = 'stjarndag_parent_ui_view';
  var childKey = function (id) { return 'stjarndag_child_ui_view_' + id; };

  var _role = null;
  var _childId = null;
  var _mode = 'classic';
  var _allowed = false;
  var _optimisticMagic = false;
  var _ready = false;
  var _listeners = [];

  function persistChildDbMode(mode) {
    if (_role !== 'child' || !_childId || !_allowed) return;
    fetch('/api/children/' + _childId + '/view-config/self', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ view_mode: uiModeToDb(mode) }),
    }).catch(function () {});
  }

  function normalize(mode) {
    return mode === 'magic' ? 'magic' : 'classic';
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
    if (!_allowed) return;
    try {
      localStorage.setItem(key, normalize(mode));
    } catch (_) {}
  }

  function notify() {
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](_mode, _role); } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent('stjarndag-view-mode', { detail: { mode: _mode, role: _role, allowed: _allowed } }));
  }

  function applyBodyClasses() {
    var magic = _mode === 'magic' && (_allowed || _optimisticMagic);
    document.body.classList.toggle('parent-magic-view', _role === 'parent' && magic);
    // parent-magic-dashboard is owned by DashboardHomeHub on /dashboard only —
    // do not set it globally or classic↔magic toggle breaks on other pages.
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

  /** Apply stored parent mode before /api/auth/me — avoids classic flash on navigation. */
  function applyStoredParentModeOptimistic() {
    var stored = readStorage(PARENT_KEY);
    if (stored !== 'magic' || !document.body) return false;
    _role = 'parent';
    _childId = null;
    _mode = 'magic';
    _optimisticMagic = true;
    applyBodyClasses();
    updateToggleUi();
    if (window.ParentMagicShell && typeof ParentMagicShell.refresh === 'function') {
      try { ParentMagicShell.refresh(); } catch (_) {}
    }
    return true;
  }

  function setToggleVisible(visible) {
    document.querySelectorAll('.app-view-toggle-wrap').forEach(function (el) {
      el.style.display = visible ? '' : 'none';
    });
  }

  function updateToggleUi() {
    document.querySelectorAll('[data-app-view-toggle]').forEach(function (wrap) {
      var classicBtn = wrap.querySelector('[data-view="classic"]');
      var magicBtn = wrap.querySelector('[data-view="magic"]');
      if (classicBtn) classicBtn.classList.toggle('is-active', _mode === 'classic');
      if (magicBtn) magicBtn.classList.toggle('is-active', _mode === 'magic');
      wrap.setAttribute('data-active-view', _mode);
    });
  }

  function fetchAccess() {
    return fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        _allowed = !!(data && data.magic_view_enabled);
        return _allowed;
      })
      .catch(function () {
        _allowed = false;
        return false;
      });
  }

  function finishInit(modeFromStorage) {
    _optimisticMagic = false;
    _mode = _allowed ? normalize(modeFromStorage || 'classic') : 'classic';
    _ready = true;
    applyBodyClasses();
    updateToggleUi();
    setToggleVisible(_allowed);
    notify();
    return _allowed;
  }

  function initParent() {
    _role = 'parent';
    _childId = null;
    var stored = readStorage(PARENT_KEY);
    if (stored === 'magic') {
      _mode = 'magic';
      _optimisticMagic = true;
      applyBodyClasses();
      updateToggleUi();
    }
    return fetchAccess().then(function () {
      return finishInit(stored);
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
      return finishInit(dbUi);
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
    return _mode === 'magic' && (_allowed || _optimisticMagic);
  }

  function isClassic() {
    return _mode !== 'magic' || (!_allowed && !_optimisticMagic);
  }

  function setMode(mode, options) {
    options = options || {};
    if (!_allowed) {
      _mode = 'classic';
      applyBodyClasses();
      return _mode;
    }
    mode = normalize(mode);
    if (mode === _mode && !options.force) return _mode;

    _mode = mode;
    if (_role === 'parent') {
      writeStorage(PARENT_KEY, mode);
    } else if (_role === 'child' && _childId) {
      writeStorage(childKey(_childId), mode);
      persistChildDbMode(mode);
    }

    applyBodyClasses();
    updateToggleUi();
    notify();
    return _mode;
  }

  function toggle() {
    if (!_allowed) return 'classic';
    return setMode(_mode === 'magic' ? 'classic' : 'magic');
  }

  function onChange(fn) {
    if (typeof fn === 'function') _listeners.push(fn);
  }

  function mountToggle(container) {
    if (!container || !_allowed) {
      if (container) container.innerHTML = '';
      return;
    }
    container.innerHTML =
      '<div class="app-view-toggle" data-app-view-toggle role="group" aria-label="Välj vy">' +
      '<span class="app-view-toggle-label">Vy</span>' +
      '<button type="button" class="app-view-toggle-btn" data-view="classic" aria-pressed="false">' +
      '<span class="app-view-toggle-icon" aria-hidden="true">📋</span>Klassisk</button>' +
      '<button type="button" class="app-view-toggle-btn" data-view="magic" aria-pressed="false">' +
      '<span class="app-view-toggle-icon" aria-hidden="true">✨</span>Ny design</button>' +
      '</div>';

    container.querySelectorAll('.app-view-toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-view');
        if (target && target !== _mode) setMode(target);
      });
    });
    updateToggleUi();
    if (window.ParentMagicAuto && ParentMagicAuto.ensureTopChrome) {
      ParentMagicAuto.ensureTopChrome();
    }
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
  };

  // If scripts load after DOM ready, apply optimistic mode immediately.
  if (document.body && readStorage(PARENT_KEY) === 'magic') {
    applyStoredParentModeOptimistic();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      if (readStorage(PARENT_KEY) === 'magic') applyStoredParentModeOptimistic();
    });
  }
})();
