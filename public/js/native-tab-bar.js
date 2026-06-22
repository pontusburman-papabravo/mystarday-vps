/**
 * native-tab-bar.js — Parent bottom tab bar (PWA + native). Reads NavConfig (vuxenmeny v2).
 */
(function () {
  'use strict';

  function isNativeShell() {
    if (typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative()) return true;
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) return true;
    return false;
  }

  var path = (window.location.pathname || '').replace(/\/$/, '');
  if (path === '/child-login' || path === '/child-dashboard' || path.indexOf('/child/') === 0) return;
  if (!window.NavConfig) return;

  var activeTabs = NavConfig.primaryNavForTabs();
  var tabsReady = true;
  var mountPending = false;
  var MOBILE_NAV_MQ = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(max-width: 767px)')
    : null;

  function isMobileViewport() {
    return MOBILE_NAV_MQ ? MOBILE_NAV_MQ.matches : false;
  }

  function isActive(tab) {
    var active = NavConfig.activeNavItem(window.location.pathname);
    return active && (active.id === tab.id || active.href === tab.href);
  }

  function hasParentShell() {
    if (document.getElementById('sidebar') || document.querySelector('nav.bg-navy')) return true;
    return NavConfig.isParentShellPath(window.location.pathname);
  }

  function hideLegacyBottomNav() {
    var legacy = document.getElementById('parentBottomNav');
    if (legacy) legacy.style.display = 'none';
  }

  function buildNavHtml() {
    var items = '';
    for (var j = 0; j < activeTabs.length; j++) {
      var tab = activeTabs[j];
      var active = isActive(tab);
      items +=
        '<a href="' + tab.href + '" class="tab-item' + (active ? ' active' : '') + '"' +
        ' data-tab-href="' + tab.href + '"' +
        (active ? ' aria-current="page"' : '') + '>' +
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
    if (!isMobileViewport()) return false;
    if (!hasParentShell()) return false;

    var items = buildNavHtml();
    if (!items) return false;

    var existing = document.querySelector('.native-tab-bar');
    if (existing) {
      existing.innerHTML = items;
      hideLegacyBottomNav();
      return true;
    }

    document.body.classList.add('has-native-tab-bar');

    var mobileTopbar = document.querySelector('.mobile-topbar');
    if (mobileTopbar) mobileTopbar.remove();
    var mobileDropdown = document.querySelector('.mobile-dropdown');
    if (mobileDropdown) mobileDropdown.remove();

    var nav = document.createElement('nav');
    nav.className = 'native-tab-bar';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Huvudnavigering');
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
    tryMount();
    return Promise.resolve();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootMount);
  } else {
    bootMount();
  }

  function handleViewportChange() {
    if (isMobileViewport()) {
      tryMount();
    } else {
      unmount();
    }
    window.dispatchEvent(new CustomEvent('stjarndag-parent-nav-layout'));
  }

  if (MOBILE_NAV_MQ) {
    if (typeof MOBILE_NAV_MQ.addEventListener === 'function') {
      MOBILE_NAV_MQ.addEventListener('change', handleViewportChange);
    } else if (typeof MOBILE_NAV_MQ.addListener === 'function') {
      MOBILE_NAV_MQ.addListener(handleViewportChange);
    }
  }

  window.addEventListener('platform-theme-applied', function () {
    if (tabsReady) tryMount();
    else bootMount();
  });

  window.addEventListener('stjarndag-package-access-loaded', function () {
    if (!window.NavConfig) return;
    activeTabs = NavConfig.primaryNavForTabs();
    tabsReady = true;
    remount();
  });

  window.addEventListener('stjarndag-features-loaded', function () {
    remount();
  });

  window.NativeTabBar = {
    remount: remount,
    mount: mount,
  };
})();
