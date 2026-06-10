/**
 * dashboard-child-handoff.js — tydlig "barnet loggar in" / logout på föräldraöversikten.
 * Viktigt i native app där sidomeny och logout saknas på Hem.
 */
(function () {
  'use strict';

  var DISMISS_KEY = 'dashboard_child_handoff_dismissed';
  var DISMISS_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days (mobile web only)

  function isNativeShell() {
    return (window.Platform && Platform.isNative && Platform.isNative()) ||
      document.body.classList.contains('has-native-tab-bar') ||
      document.documentElement.classList.contains('platform-native');
  }

  function isMobileWeb() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  function isDismissed() {
    if (isNativeShell()) return false;
    try {
      var raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      return Date.now() - parsed.ts < DISMISS_TTL;
    } catch (_) {
      return false;
    }
  }

  function dismiss() {
    if (isNativeShell()) return;
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ ts: Date.now() }));
    } catch (_) {}
    var el = document.getElementById('dashboardChildHandoff');
    if (el) el.classList.add('hidden');
  }

  function startChildLogin() {
    if (window.Auth && typeof Auth.logout === 'function') {
      Auth.logout({ childFlow: true });
    } else {
      window.location.href = '/child-login';
    }
  }

  function parentLogout() {
    if (window.Auth && typeof Auth.logout === 'function') {
      Auth.logout();
    } else if (typeof window.logout === 'function') {
      window.logout();
    } else {
      window.location.href = '/login';
    }
  }

  function init() {
    var el = document.getElementById('dashboardChildHandoff');
    if (!el) return;

    if (!isNativeShell() && !isMobileWeb()) {
      el.classList.add('hidden');
      return;
    }
    if (isDismissed()) {
      el.classList.add('hidden');
      return;
    }

    el.classList.remove('hidden');

    var childBtn = document.getElementById('dashboardChildLoginBtn');
    var logoutBtn = document.getElementById('dashboardParentLogoutBtn');
    var dismissBtn = document.getElementById('dashboardChildHandoffDismiss');

    if (childBtn) childBtn.addEventListener('click', startChildLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', parentLogout);
    if (dismissBtn) {
      dismissBtn.classList.toggle('hidden', isNativeShell());
      dismissBtn.addEventListener('click', dismiss);
    }
  }

  window.DashboardChildHandoff = { init: init, dismiss: dismiss };
})();
