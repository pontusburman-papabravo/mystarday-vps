/**
 * session-gate.js — Central routing när device_mode === 'child' (Sprint 3a/3c).
 * Körs tidigt via platform-html inject på alla HTML-sidor.
 */
(function () {
  'use strict';

  var PARENT_ONLY_PATHS = [
    '/dashboard',
    '/schedule',
    '/settings',
    '/family',
    '/reports',
    '/library',
    '/activities',
    '/assign-schedule',
    '/calendar',
    '/daily-log',
    '/skattkammaren',
    '/for-dig',
    '/child-settings',
    '/notifications',
    '/pedagog-note',
    '/onboarding',
    '/admin',
  ];

  function normalizePath(path) {
    var p = (path || '/').replace(/\/$/, '') || '/';
    if (p.endsWith('.html')) p = p.slice(0, -5);
    return p;
  }

  function isParentOnlyPath(path) {
    var p = normalizePath(path);
    for (var i = 0; i < PARENT_ONLY_PATHS.length; i++) {
      if (p === PARENT_ONLY_PATHS[i] || p.indexOf(PARENT_ONLY_PATHS[i] + '/') === 0) {
        return true;
      }
    }
    return false;
  }

  function resolveRedirect(pathname) {
    if (!window.DeviceMode || !DeviceMode.isChildMode()) return null;
    var path = normalizePath(pathname);
    if (path === '/child-login' || path === '/child-dashboard' || path.indexOf('/child/') === 0 || path === '/login' || path === '/register') {
      return null;
    }
    if (isParentOnlyPath(path)) return '/child-login';
    return null;
  }

  function run() {
    var target = resolveRedirect(window.location.pathname);
    if (target && normalizePath(window.location.pathname) !== normalizePath(target)) {
      window.location.replace(target);
    }
  }

  function shouldBlockSessionRestore() {
    return window.DeviceMode && DeviceMode.isChildMode();
  }

  window.SessionGate = {
    resolveRedirect: resolveRedirect,
    shouldBlockSessionRestore: shouldBlockSessionRestore,
    run: run,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
