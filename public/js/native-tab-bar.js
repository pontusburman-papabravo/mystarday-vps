/**
 * native-tab-bar.js — Parent bottom tab bar (PWA + native Capacitor).
 * Intressefas: Hem·Schema·För dig·Skatt·Extra·Mer (+ Extra → /upgrade).
 */
(function () {
  'use strict';

  function isNativeShell() {
    if (typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative()) return true;
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) return true;
    return false;
  }

  var path = (window.location.pathname || '').replace(/\/$/, '');
  if (path === '/child-login' || path.indexOf('/child/') === 0) return;

  var LEGACY_TABS = [
    { href: '/dashboard', label: 'Hem', icon: '🏠', paths: ['/dashboard', '/daily-log', '/'] },
    { href: '/schedule', label: 'Schema', icon: '📅', paths: ['/schedule', '/calendar', '/activities', '/assign-schedule'] },
    { href: '/for-dig', label: 'För dig', icon: '✨', paths: ['/for-dig'], feature: 'for_dig' },
    { href: '/skattkammaren', label: 'Skatt', icon: '🏆', paths: ['/skattkammaren'] },
    { href: '/family', label: 'Mer', icon: '⚙️', paths: ['/family', '/settings', '/library', '/reports', '/pedagog-note', '/samarbete', '/barn-stod', '/upgrade'] },
  ];

  /** Familiar tabs + Extra (paket/intresse) when rollout ≠ off */
  var ROLLOUT_TABS = [
    { href: '/dashboard', label: 'Hem', icon: '🏠', paths: ['/dashboard', '/daily-log', '/'] },
    { href: '/schedule', label: 'Schema', icon: '📅', paths: ['/schedule', '/calendar', '/activities', '/assign-schedule', '/library'] },
    { href: '/for-dig', label: 'För dig', icon: '✨', paths: ['/for-dig'], feature: 'for_dig' },
    { href: '/skattkammaren', label: 'Skatt', icon: '🏆', paths: ['/skattkammaren'] },
    { href: '/upgrade', label: 'Extra', icon: '💫', paths: ['/upgrade', '/reports', '/samarbete', '/barn-stod', '/pedagog-note', '/pedagog-oversikt'] },
    { href: '/family', label: 'Mer', icon: '⚙️', paths: ['/family', '/settings', '/child-settings'] },
  ];

  var activeTabs = LEGACY_TABS;
  var tabsReady = false;
  var mountPending = false;

  function isActive(tab) {
    var p = path || '/';
    for (var i = 0; i < tab.paths.length; i++) {
      var tp = tab.paths[i];
      if (p === tp) return true;
      if (tp === '/dashboard' && p.indexOf('/daily') === 0) return true;
      if (tp !== '/' && p.indexOf(tp + '/') === 0) return true;
    }
    return false;
  }

  var HUB_PATHS = ['/reports', '/samarbete', '/barn-stod', '/upgrade'];

  function hasParentShell() {
    if (document.getElementById('sidebar') || document.querySelector('nav.bg-navy')) return true;
    var p = path || '/';
    for (var i = 0; i < HUB_PATHS.length; i++) {
      var hp = HUB_PATHS[i];
      if (p === hp || p.indexOf(hp + '/') === 0) return true;
    }
    return false;
  }

  function isTabVisible(tab) {
    if (!tab.feature) return true;
    var features = window._stjarndagFeatures;
    if (!features) return true;
    return !!features[tab.feature];
  }

  function pickTabs(access) {
    return (access && access.rollout_mode && access.rollout_mode !== 'off')
      ? ROLLOUT_TABS
      : LEGACY_TABS;
  }

  function loadTabsConfig() {
    var loader = window.fetchPackageAccess
      ? window.fetchPackageAccess()
      : fetch('/api/subscription/access', { credentials: 'include' })
          .then(function (r) { return r.ok ? r.json() : null; });

    return loader
      .then(function (access) {
        activeTabs = pickTabs(access);
        tabsReady = true;
      })
      .catch(function () {
        activeTabs = LEGACY_TABS;
        tabsReady = true;
      });
  }

  function hideLegacyBottomNav() {
    var legacy = document.getElementById('parentBottomNav');
    if (legacy) legacy.style.display = 'none';
  }

  function buildNavHtml() {
    var items = '';
    for (var j = 0; j < activeTabs.length; j++) {
      var tab = activeTabs[j];
      if (!isTabVisible(tab)) continue;
      var active = isActive(tab);
      var featureAttr = tab.feature ? ' data-feature="' + tab.feature + '"' : '';
      items +=
        '<a href="' + tab.href + '" class="tab-item' + (active ? ' active' : '') + '"' +
        ' data-tab-href="' + tab.href + '"' + featureAttr + '>' +
        '<span class="tab-icon">' + tab.icon + '</span>' +
        '<span class="tab-label">' + tab.label + '</span></a>';
    }
    return items;
  }

  function unmount() {
    var existing = document.querySelector('.native-tab-bar');
    if (existing) existing.remove();
    document.body.classList.remove('has-native-tab-bar');
  }

  function mount() {
    if (!tabsReady) return false;
    if (!hasParentShell()) return false;

    var items = buildNavHtml();
    if (!items) return false;

    var existing = document.querySelector('.native-tab-bar');
    if (existing) {
      existing.innerHTML = items;
      existing.classList.toggle('tab-bar--many', activeTabs.length >= 6);
      hideLegacyBottomNav();
      return true;
    }

    document.body.classList.add('has-native-tab-bar');

    var mobileTopbar = document.querySelector('.mobile-topbar');
    if (mobileTopbar) mobileTopbar.remove();
    var mobileDropdown = document.querySelector('.mobile-dropdown');
    if (mobileDropdown) mobileDropdown.remove();

    var nav = document.createElement('nav');
    nav.className = 'native-tab-bar' + (activeTabs.length >= 6 ? ' tab-bar--many' : '');
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Huvudmeny');
    nav.innerHTML = items;
    document.body.appendChild(nav);
    hideLegacyBottomNav();

    nav.addEventListener('click', function (e) {
      var link = e.target.closest('a.tab-item');
      if (!link) return;
      if (isNativeShell() && Platform.haptics && Platform.haptics.light) {
        Platform.haptics.light();
      }
    });
    return true;
  }

  function tryMount() {
    if (mount()) return;
    if (!tabsReady || mountPending) return;
    mountPending = true;
    var retries = 0;
    var timer = setInterval(function () {
      retries += 1;
      if (mount() || retries >= 30) {
        clearInterval(timer);
        mountPending = false;
      }
    }, 100);
  }

  function remount() {
    unmount();
    tryMount();
  }

  function bootMount() {
    return loadTabsConfig().then(function () {
      tryMount();
    });
  }

  function start() {
    fetch('/api/app-config', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (cfg && (cfg.nativeTabbarEnabled === false || cfg.native_tabbar_enabled === false)) return;
        return bootMount();
      })
      .catch(function () {
        return bootMount();
      });
  }

  function boot() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }

    window.addEventListener('platform-theme-applied', function () {
      if (tabsReady) tryMount();
      else bootMount();
    });

    window.addEventListener('stjarndag-package-access-loaded', function (e) {
      var next = pickTabs(e.detail);
      var changed = next.length !== activeTabs.length ||
        next.some(function (t, i) { return t.href !== activeTabs[i].href; });
      if (!changed) return;
      activeTabs = next;
      tabsReady = true;
      remount();
    });

    window.addEventListener('stjarndag-features-loaded', function () {
      var needsRemount = activeTabs.some(function (tab) {
        if (!tab.feature) return false;
        var nowVisible = isTabVisible(tab);
        var tabEl = document.querySelector('.native-tab-bar .tab-item[data-tab-href="' + tab.href + '"]');
        return nowVisible !== !!tabEl;
      });
      if (needsRemount) remount();
    });
  }

  boot();
})();
