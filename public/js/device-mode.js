/**
 * device-mode.js — Barnläge vs vuxenläge på enheten (P0.1 Session Gate).
 * Persistens: localStorage (webb) — native kan utökas med Preferences i senare sprint.
 */
(function () {
  'use strict';

  const KEY = 'stjarndag_device_mode';

  function get() {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'child' ? 'child' : 'parent';
    } catch (_) {
      return 'parent';
    }
  }

  function set(mode) {
    try {
      localStorage.setItem(KEY, mode === 'child' ? 'child' : 'parent');
    } catch (_) {}
  }

  function isChildMode() {
    return get() === 'child';
  }

  window.DeviceMode = {
    get: get,
    set: set,
    enterChild: function () { set('child'); },
    enterParent: function () { set('parent'); },
    isChildMode: isChildMode,
  };
})();
