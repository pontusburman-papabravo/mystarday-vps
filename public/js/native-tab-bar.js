/**
 * native-tab-bar.js — Parent bottom tab bar (PWA + native Capacitor).
 * Same five tabs on web and in the app: Hem · Schema · För dig · Skatt · Mer.
 * Injected on all parent-shell HTML pages via platform-html middleware.
 */
(function () {
  'use strict';

  function isNativeShell() {
    if (typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative()) return true;
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) return true;
    return false;
  }

  var path = (window.location.pathname || '').replace(/\/$/, '');
  if (path === '/child-dashboard' || path === '/child-login') return;

  var TABS = [
    { href: '/dashboard', label: 'Hem', icon: '🏠', paths: ['/dashboard', '/daily-log', '/'] },
    { href: '/schedule', label: 'Schema', icon: '📅', paths: ['/schedule', '/calendar', '/activities', '/assign-schedule'] },
    { href: '/for-dig', label: 'För dig', icon: '✨', paths: ['/for-dig'], feature: 'for_dig' },
    { href: '/skattkammaren', label: 'Skatt', icon: '🏆', paths: ['/skattkammaren'] },
    { href: '/family', label: 'Mer', icon: '⚙️', paths: ['/family', '/settings', '/library', '/reports', '/pedagog-note'] },
  ];

  function isActive(tab) {
    var p = path || '/';
    for (var i = 0; i < tab.paths.length; i++) {
      if (p === tab.paths[i]) return true;
      if (tab.paths[i] === '/dashboard' && p.indexOf('/daily') === 0) return true;
    }
    return false;
  }

  function hasParentShell() {
    return !!(
      document.getElementById('sidebar') ||
      document.querySelector('nav.bg-navy')
    );
  }

  function isTabVisible(tab) {
    if (!tab.feature) return true;
    var features = window._stjarndagFeatures;
    if (!features) return true;
    return !!features[tab.feature];
  }

  function mount() {
    if (document.querySelector('.native-tab-bar')) return true;
    if (!hasParentShell()) return false;

    document.body.classList.add('has-native-tab-bar');

    // Remove mobile-nav.js topbar/dropdown from DOM — prevents FOUC where
    // hamburger is briefly visible before this tab bar takes over.
    var mobileTopbar = document.querySelector('.mobile-topbar');
    if (mobileTopbar) mobileTopbar.remove();
    var mobileDropdown = document.querySelector('.mobile-dropdown');
    if (mobileDropdown) mobileDropdown.remove();

    var items = '';
    for (var j = 0; j < TABS.length; j++) {
      var tab = TABS[j];
      if (!isTabVisible(tab)) continue;
      var active = isActive(tab);
      var featureAttr = tab.feature ? ' data-feature="' + tab.feature + '"' : '';
      items +=
        '<a href="' + tab.href + '" class="tab-item' + (active ? ' active' : '') + '"' +
        ' data-tab-href="' + tab.href + '"' + featureAttr + '>' +
        '<span class="tab-icon">' + tab.icon + '</span>' +
        '<span class="tab-label">' + tab.label + '</span></a>';
    }

    var nav = document.createElement('nav');
    nav.className = 'native-tab-bar';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Huvudmeny');
    nav.innerHTML = items;
    document.body.appendChild(nav);

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
    var retries = 0;
    var timer = setInterval(function () {
      retries += 1;
      if (mount() || retries >= 30) clearInterval(timer);
    }, 100);
  }

  function start() {
    fetch('/api/app-config', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (cfg && (cfg.nativeTabbarEnabled === false || cfg.native_tabbar_enabled === false)) return;
        tryMount();
      })
      .catch(function () {
        tryMount();
      });
  }

  function boot() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
    window.addEventListener('platform-theme-applied', function () {
      tryMount();
    });
    window.addEventListener('stjarndag-features-loaded', function () {
      // Only remount if a gated tab's visibility actually changed.
      // For most families (for_dig is live) nothing changes → skip the flash.
      var needsRemount = TABS.some(function (tab) {
        if (!tab.feature) return false;
        var nowVisible = isTabVisible(tab);
        var tabEl = document.querySelector('.native-tab-bar .tab-item[data-tab-href="' + tab.href + '"]');
        var wasVisible = !!tabEl;
        return nowVisible !== wasVisible;
      });
      if (!needsRemount) return;
      var existing = document.querySelector('.native-tab-bar');
      if (existing) existing.remove();
      document.body.classList.remove('has-native-tab-bar');
      tryMount();
    });
  }

  boot();
})();
