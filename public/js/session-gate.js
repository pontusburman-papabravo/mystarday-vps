/**
 * session-gate.js — Central routing när device_mode === 'child' (Sprint 3a/3c).
 * Fas 2B: defers to AppEntryOrchestrator when authoritative decision is active.
 */
(function () {
  'use strict';

  const PARENT_ONLY_PATHS = [
    '/home',
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
    '/planning',
    '/rewards',
  ];

  function normalizePath(path) {
    let p = (path || '/').replace(/\/$/, '') || '/';
    if (p.endsWith('.html')) p = p.slice(0, -5);
    return p;
  }

  function isParentOnlyPath(path) {
    const p = normalizePath(path);
    for (let i = 0; i < PARENT_ONLY_PATHS.length; i++) {
      if (p === PARENT_ONLY_PATHS[i] || p.indexOf(PARENT_ONLY_PATHS[i] + '/') === 0) {
        return true;
      }
    }
    return false;
  }

  function isChildViewAuthoritative() {
    if (window.AppEntryOrchestrator && AppEntryOrchestrator.isExplicitParentResumePending
      && AppEntryOrchestrator.isExplicitParentResumePending()) {
      return false;
    }
    if (window.AppEntryOrchestrator && AppEntryOrchestrator.isExplicitParentResumeActive
      && AppEntryOrchestrator.isExplicitParentResumeActive()) {
      return false;
    }
    if (window.AppEntryOrchestrator && AppEntryOrchestrator.isActive && AppEntryOrchestrator.isActive()) {
      if (AppEntryOrchestrator.isDecisionApplied && !AppEntryOrchestrator.isDecisionApplied()) {
        return false;
      }
      const ctx = AppEntryOrchestrator.getAppliedViewContext && AppEntryOrchestrator.getAppliedViewContext();
      if (ctx === 'child') return true;
      if (ctx === 'parent' || ctx === 'picker') return false;
      return false;
    }
    return window.DeviceMode && DeviceMode.isChildMode();
  }

  function resolveRedirect(pathname) {
    if (window.AppEntryOrchestrator && AppEntryOrchestrator.isExplicitParentResumePending
      && AppEntryOrchestrator.isExplicitParentResumePending()) {
      return null;
    }
    if (window.AppEntryOrchestrator && AppEntryOrchestrator.isExplicitParentResumeActive
      && AppEntryOrchestrator.isExplicitParentResumeActive()) {
      return null;
    }
    if (window.AppEntryOrchestrator && AppEntryOrchestrator.shouldDeferSessionGate
      && AppEntryOrchestrator.shouldDeferSessionGate()) {
      return null;
    }

    if (!isChildViewAuthoritative()) return null;

    const path = normalizePath(pathname);
    if (path === '/child-login' || path === '/child-dashboard' || path.indexOf('/child/') === 0 || path === '/login' || path === '/register') {
      return null;
    }
    if (isParentOnlyPath(path)) {
      if (window.AppEntryOrchestrator && AppEntryOrchestrator.isActive && AppEntryOrchestrator.isActive()) {
        const d = AppEntryOrchestrator.getAppliedDecision && AppEntryOrchestrator.getAppliedDecision();
        if (d && d.destination === 'child-home' && d.path) {
          return d.path;
        }
        if (d && d.destination === 'profile-picker' && d.path) {
          return d.path;
        }
      }
      if (window.AppEntryOrchestrator && AppEntryOrchestrator.isDailyUxActive
        && AppEntryOrchestrator.isDailyUxActive()) {
        return '/child/profile-picker';
      }
      return '/child-login';
    }
    return null;
  }

  function run() {
    if (window.AppEntryOrchestrator && AppEntryOrchestrator.isExplicitParentResumePending
      && AppEntryOrchestrator.isExplicitParentResumePending()) {
      return;
    }
    if (window.AppEntryOrchestrator && AppEntryOrchestrator.shouldDeferSessionGate
      && AppEntryOrchestrator.shouldDeferSessionGate()) {
      return;
    }
    const target = resolveRedirect(window.location.pathname);
    if (target && normalizePath(window.location.pathname) !== normalizePath(target)) {
      window.location.replace(target);
    }
  }

  function shouldBlockSessionRestore() {
    if (window.AppEntryOrchestrator && AppEntryOrchestrator.isActive && AppEntryOrchestrator.isActive()) {
      const ctx = AppEntryOrchestrator.getAppliedViewContext && AppEntryOrchestrator.getAppliedViewContext();
      return ctx === 'child';
    }
    return window.DeviceMode && DeviceMode.isChildMode();
  }

  window.SessionGate = {
    resolveRedirect: resolveRedirect,
    shouldBlockSessionRestore: shouldBlockSessionRestore,
    run: run,
    isChildViewAuthoritative: isChildViewAuthoritative,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
