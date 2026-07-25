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

  const path = (window.location.pathname || '').replace(/\/$/, '') || '/';
  if (path === '/child-login' || path === '/child-dashboard' || path.indexOf('/child/') === 0) return;
  if (
    (path === '/' || path === '') &&
    (document.querySelector('.landing-nav') || document.body.classList.contains('landing-page'))
  ) {
    return;
  }
  if (!window.NavConfig) return;

  let activeTabs = [];
  let tabsReady = false;
  let mountPending = false;
  const MOBILE_NAV_MQ = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(max-width: 767px)')
    : null;

  function isMobileViewport() {
    return MOBILE_NAV_MQ ? MOBILE_NAV_MQ.matches : false;
  }

  function isActive(tab) {
    const active = NavConfig.activeNavItem(window.location.pathname);
    return active && (active.id === tab.id || active.href === tab.href);
  }

  function hasParentShell() {
    if (document.getElementById('sidebar')) return true;
    if (window.NavConfig && NavConfig.isParentShellPath(window.location.pathname)) return true;
    return false;
  }

  function hideLegacyBottomNav() {
    const legacy = document.getElementById('parentBottomNav');
    if (legacy) legacy.style.display = 'none';
  }

  function syncActiveTabs() {
    if (!window.NavConfig || !NavConfig.primaryNavForTabs) return;
    activeTabs = NavConfig.primaryNavForTabs();
    tabsReady = true;
  }

  function buildNavHtml() {
    syncActiveTabs();
    let items = '';
    for (let j = 0; j < activeTabs.length; j++) {
      const tab = activeTabs[j];
      const active = isActive(tab);
      items +=
        '<a href="' + tab.href + '" class="tab-item' + (active ? ' active' : '') + '"' +
        ' data-tab-href="' + tab.href + '"' +
        (active ? ' aria-current="page"' : '') + '>' +
        '<span class="tab-icon">' + (window.IconSystem ? IconSystem.forItem(Object.assign({}, tab, { active: active }), 28, 'app-icon app-icon--nav') : tab.icon) + '</span>' +
        '<span class="tab-label">' + tab.label + '</span></a>';
    }
    return items;
  }

  function unmount() {
    const existing = document.querySelector('.native-tab-bar');
    if (existing) existing.remove();
    document.body.classList.remove('has-native-tab-bar');
  }

  function mount() {
    syncActiveTabs();
    if (!tabsReady) return false;
    if (!isMobileViewport()) return false;
    if (!hasParentShell()) return false;

    const items = buildNavHtml();
    if (!items) return false;

    const existing = document.querySelector('.native-tab-bar');
    if (existing) {
      existing.innerHTML = items;
      hideLegacyBottomNav();
      return true;
    }

    document.body.classList.add('has-native-tab-bar');

    const mobileTopbar = document.querySelector('.mobile-topbar');
    if (mobileTopbar) mobileTopbar.remove();
    const mobileDropdown = document.querySelector('.mobile-dropdown');
    if (mobileDropdown) mobileDropdown.remove();

    const nav = document.createElement('nav');
    nav.className = 'native-tab-bar';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', (typeof window.pt === 'function') ? window.pt('nav.mainAria') : 'Huvudnavigering');
    nav.innerHTML = items;
    document.body.appendChild(nav);
    hideLegacyBottomNav();

    nav.addEventListener('click', function (e) {
      const link = e.target.closest('a.tab-item');
      if (!link) return;
      if (isNativeShell() && Platform.haptics && Platform.haptics.light) {
        Platform.haptics.light();
      }
      const href = link.getAttribute('href');
      if (!href || href.charAt(0) !== '/') return;
      if (typeof window.closeAllLibraryModals === 'function') closeAllLibraryModals();
      const router = window.ParentMagicRouter;
      if (!router) return;
      if (window.NavConfig && NavConfig.isLibraryPath && NavConfig.isLibraryPath(window.location.pathname)) {
        const dest = NavConfig.normalizePath(href.split('#')[0].split('?')[0]);
        if (dest !== '/library') {
          e.preventDefault();
          window.location.href = href;
          return;
        }
      }
      if (router.isFullLoadPath && router.isFullLoadPath(href)) {
        e.preventDefault();
        window.location.href = href;
        return;
      }
      if (router.shouldSoftNav && router.shouldSoftNav()
          && router.isSoftNavPath && router.isSoftNavPath(href)) {
        e.preventDefault();
        router.navigateTo(href);
      }
    });
    return true;
  }

  function tryMount() {
    if (mount()) return;
    if (!tabsReady || mountPending) return;
    mountPending = true;
    let retries = 0;
    var timer = setInterval(function () {
      retries += 1;
      if (mount() || retries >= 30) {
        clearInterval(timer);
        mountPending = false;
      }
    }, 100);
  }

  function updateActiveTabs() {
    remount();
  }

  function remount() {
    const existing = document.querySelector('.native-tab-bar');
    if (existing) {
      existing.innerHTML = buildNavHtml();
      hideLegacyBottomNav();
      return;
    }
    tryMount();
  }

  function navLabelsReady() {
    if (typeof window.pt !== 'function') return false;
    const sample = window.pt('nav.primary.home');
    return sample && sample !== 'nav.primary.home';
  }

  function scheduleBootMount() {
    if (navLabelsReady()) {
      bootMount();
      return;
    }
    document.addEventListener('parent-i18n-ready', bootMount, { once: true });
    setTimeout(bootMount, 3500);
  }

  function bootMount() {
    syncActiveTabs();
    tryMount();
    return Promise.resolve();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleBootMount);
  } else {
    scheduleBootMount();
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
    syncActiveTabs();
    remount();
  });

  window.addEventListener('stjarndag-features-loaded', function () {
    remount();
  });

  window.addEventListener('stjarndag-magic-navigated', function () {
    updateActiveTabs();
  });

  document.addEventListener('locale-changed', function () {
    syncActiveTabs();
    remount();
  });
  document.addEventListener('parent-i18n-ready', function () {
    syncActiveTabs();
    remount();
  });

  window.NativeTabBar = {
    remount: remount,
    mount: mount,
    updateActiveTabs: updateActiveTabs,
  };
})();
