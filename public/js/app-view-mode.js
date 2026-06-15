/**
 * app-view-mode.js — Växla mellan klassisk vy och mockup/redesign (magic).
 * Förälder: localStorage. Barn: localStorage per barn (init från child_view_config).
 */
(function () {
  'use strict';

  var PARENT_KEY = 'stjarndag_parent_ui_view';
  var childKey = function (id) { return 'stjarndag_child_ui_view_' + id; };

  var _role = null; // 'parent' | 'child'
  var _childId = null;
  var _mode = 'classic'; // 'classic' | 'magic'
  var _listeners = [];

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
    try {
      localStorage.setItem(key, normalize(mode));
    } catch (_) {}
  }

  function notify() {
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](_mode, _role); } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent('stjarndag-view-mode', { detail: { mode: _mode, role: _role } }));
  }

  function applyBodyClasses() {
    var magic = _mode === 'magic';
    document.body.classList.toggle('parent-magic-dashboard', _role === 'parent' && magic);
    document.body.classList.toggle('child-magic-view', _role === 'child' && magic);
    document.body.classList.toggle('child-has-bottom-nav', _role === 'child' && magic);
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

  function initParent() {
    _role = 'parent';
    _childId = null;
    _mode = normalize(readStorage(PARENT_KEY) || 'classic');
    applyBodyClasses();
    updateToggleUi();
  }

  function initChild(childId, dbViewMode) {
    _role = 'child';
    _childId = childId;
    var stored = childId ? readStorage(childKey(childId)) : null;
    _mode = normalize(stored || dbModeToUi(dbViewMode || 'classic'));
    applyBodyClasses();
    updateToggleUi();
  }

  function getMode() {
    return _mode;
  }

  function isMagic() {
    return _mode === 'magic';
  }

  function isClassic() {
    return _mode === 'classic';
  }

  function setMode(mode, options) {
    options = options || {};
    mode = normalize(mode);
    if (mode === _mode && !options.force) return _mode;

    _mode = mode;
    if (_role === 'parent') {
      writeStorage(PARENT_KEY, mode);
    } else if (_role === 'child' && _childId) {
      writeStorage(childKey(_childId), mode);
    }

    applyBodyClasses();
    updateToggleUi();
    notify();
    return _mode;
  }

  function toggle() {
    return setMode(_mode === 'magic' ? 'classic' : 'magic');
  }

  function onChange(fn) {
    if (typeof fn === 'function') _listeners.push(fn);
  }

  function mountToggle(container) {
    if (!container) return;
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
  }

  window.AppViewMode = {
    initParent: initParent,
    initChild: initChild,
    getMode: getMode,
    isMagic: isMagic,
    isClassic: isClassic,
    setMode: setMode,
    toggle: toggle,
    onChange: onChange,
    mountToggle: mountToggle,
    uiModeToDb: uiModeToDb,
    dbModeToUi: dbModeToUi,
  };
})();
