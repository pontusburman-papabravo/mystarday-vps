/**
 * adult-privilege-lifecycle.js — single owner for background / lease expiry (Fas 3B).
 */
(function () {
  'use strict';

  let policy = null;
  let leaseUntilMs = null;
  let hiddenAtMs = null;
  let expiryTimer = null;
  let started = false;

  function clearTimer() {
    if (expiryTimer) {
      clearTimeout(expiryTimer);
      expiryTimer = null;
    }
  }

  function scheduleLeaseCheck() {
    clearTimer();
    if (!leaseUntilMs || !window.AdultPrivilegeLeasePolicy) return;
    const delay = Math.max(0, leaseUntilMs - Date.now() + 50);
    expiryTimer = setTimeout(function () {
      if (window.AdultPrivilege && typeof AdultPrivilege.expirePrivilegeIfDue === 'function') {
        AdultPrivilege.expirePrivilegeIfDue('lease_timer');
      }
    }, delay);
  }

  function onPolicyUpdate(nextPolicy, nextLeaseUntil) {
    policy = nextPolicy || policy;
    leaseUntilMs = nextLeaseUntil || leaseUntilMs;
    scheduleLeaseCheck();
  }

  function onForeground() {
    if (!policy || !window.AdultPrivilegeLeasePolicy) return;
    if (!AdultPrivilegeLeasePolicy.shouldAutoExpireOnBackground(policy.deviceMode)) {
      hiddenAtMs = null;
      return;
    }
    if (!hiddenAtMs) return;
    const grace = AdultPrivilegeLeasePolicy.backgroundGraceMs(policy.deviceMode);
    const awayMs = Date.now() - hiddenAtMs;
    hiddenAtMs = null;
    if (awayMs > grace && window.AdultPrivilege) {
      AdultPrivilege.expirePrivilegeIfDue('background');
    }
  }

  function onBackground() {
    if (!policy || !window.AdultPrivilegeLeasePolicy) return;
    if (!AdultPrivilegeLeasePolicy.shouldAutoExpireOnBackground(policy.deviceMode)) return;
    hiddenAtMs = Date.now();
  }

  function bindVisibility() {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') onBackground();
      else onForeground();
    });
    window.addEventListener('pagehide', onBackground);
    window.addEventListener('pageshow', onForeground);
  }

  function bindCapacitorApp() {
    if (typeof Capacitor === 'undefined' || !window.Capacitor || !window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform()) {
      return;
    }
    const App = window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (!App || typeof App.addListener !== 'function') return;
    App.addListener('appStateChange', function (state) {
      if (state && state.isActive) onForeground();
      else onBackground();
    }).catch(function () { /* ignore */ });
  }

  function start() {
    if (started) return;
    started = true;
    bindVisibility();
    bindCapacitorApp();
  }

  window.AdultPrivilegeLifecycle = {
    start: start,
    onPolicyUpdate: onPolicyUpdate,
    onPrivilegeActivated: function (nextPolicy, nextLeaseUntil) {
      start();
      onPolicyUpdate(nextPolicy, nextLeaseUntil);
    },
    onPrivilegeCleared: function () {
      leaseUntilMs = null;
      hiddenAtMs = null;
      clearTimer();
    },
    _test: {
      onForeground: onForeground,
      onBackground: onBackground,
      clearTimer: clearTimer,
    },
  };
})();
