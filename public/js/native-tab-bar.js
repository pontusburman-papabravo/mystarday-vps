/**
 * native-tab-bar.js — Sprint 4 (P0.4): 5 flikar för vuxen i native.
 * Endast Platform.isNative(); feature flag från /api/app-config.
 */
(function () {
  'use strict';

  function isNativeShell() {
    if (typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative()) return true;
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) return true;
    return false;
  }

  if (!isNativeShell()) return;

  var path = (window.location.pathname || '').replace(/\/$/, '');
  if (path === '/child-dashboard' || path === '/child-login') return;

  var TABS = [
    { href: '/dashboard', label: 'Hem', icon: '🏠', paths: ['/dashboard', '/daily-log', '/'] },
    { href: '/schedule', label: 'Schema', icon: '📅', paths: ['/schedule', '/calendar', '/activities', '/assign-schedule'] },
    { href: '/library', label: 'Bibliotek', icon: '📚', paths: ['/library', '/standard-library'] },
    { href: '/family', label: 'Familj', icon: '👨‍👩‍👧', paths: ['/family'] },
    { href: '/settings', label: 'Inställn.', icon: '⚙️', paths: ['/settings', '/reports', '/pedagog-note'] },
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
      document.querySelector('nav.bg-navy') ||
      document.querySelector('.mobile-topbar')
    );
  }

  function mount() {
    if (document.querySelector('.native-tab-bar')) return;
    if (!hasParentShell()) return false;

    document.body.classList.add('has-native-tab-bar');

    var items = '';
    for (var j = 0; j < TABS.length; j++) {
      var tab = TABS[j];
      var active = isActive(tab);
      items +=
        '<a href="' + tab.href + '" class="tab-item' + (active ? ' active' : '') + '" data-tab-href="' + tab.href + '">' +
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
      if (Platform.haptics && Platform.haptics.light) Platform.haptics.light();
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
        // Default on — native shell should not look like PWA if app-config is slow.
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
  }

  boot();
})();
