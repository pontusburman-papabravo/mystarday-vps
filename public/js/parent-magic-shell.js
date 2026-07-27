/**
 * parent-magic-shell.js — Shared magic init: toggle, 3D orbs, bottom nav, page class.
 * Bottom nav reads NavConfig (vuxenmeny v2).
 */
(function () {
  'use strict';

  let _page = null;
  let _initPromise = null;
  const MOBILE_NAV_MQ = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(max-width: 767px)')
    : null;

  function isNativeTabBarActive() {
    if (!document.body.classList.contains('has-native-tab-bar')) return false;
    if (!document.querySelector('.native-tab-bar')) return false;
    return MOBILE_NAV_MQ ? MOBILE_NAV_MQ.matches : false;
  }

  function getNavItems() {
    if (window.NavConfig && NavConfig.primaryNavForTabs) {
      return NavConfig.primaryNavForTabs();
    }
    if (window.NavConfig && NavConfig.PRIMARY_NAV) {
      return NavConfig.PRIMARY_NAV;
    }
    return [];
  }

  function navAriaLabel() {
    return (typeof window.pt === 'function') ? window.pt('nav.mainAria') : 'Huvudnavigering';
  }

  function isMagic() {
    return window.AppViewMode && AppViewMode.isAllowed() && AppViewMode.isMagic();
  }

  function isAndroidNative() {
    if (document.documentElement.classList.contains('is-native-android')) return true;
    return typeof window.Platform !== 'undefined' &&
      typeof Platform.isAndroid === 'function' &&
      Platform.isAndroid();
  }

  function ensureOrbs() {
    if (isAndroidNative()) return;
    if (document.querySelector('.magic-3d-orbs')) return;
    const wrap = document.createElement('div');
    wrap.className = 'magic-3d-orbs';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML =
      '<div class="magic-3d-orb orb-gold"></div>' +
      '<div class="magic-3d-orb orb-purple"></div>' +
      '<div class="magic-3d-orb orb-blue"></div>' +
      '<div class="magic-3d-orb orb-floor"></div>';
    document.body.insertBefore(wrap, document.body.firstChild);
  }

  function removeOrbs() {
    const el = document.querySelector('.magic-3d-orbs');
    if (el) el.remove();
  }

  function activeNavId() {
    if (window.NavConfig && NavConfig.activeNavItem) {
      const item = NavConfig.activeNavItem(window.location.pathname);
      if (item) return item.id;
    }
    return _page;
  }

  function renderBottomNav() {
    if (isNativeTabBarActive()) {
      const hidden = document.getElementById('parentBottomNav');
      if (hidden) hidden.style.display = 'none';
      if (window.NativeTabBar && NativeTabBar.remount) NativeTabBar.remount();
      if (window.ParentMagicRouter) ParentMagicRouter.bind();
      return;
    }
    let nav = document.getElementById('parentBottomNav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'parentBottomNav';
      nav.className = 'parent-bottom-nav';
      nav.setAttribute('role', 'navigation');
      nav.setAttribute('aria-label', navAriaLabel());
      document.body.appendChild(nav);
    }
    nav.removeAttribute('hidden');
    const activeId = activeNavId();
    const items = getNavItems();
    nav.innerHTML = items.map(function (item) {
      const isActive = item.id === activeId;
      const active = isActive ? ' is-active' : '';
      const aria = isActive ? ' aria-current="page"' : '';
      const iconItem = Object.assign({}, item, { active: isActive });
      return '<a href="' + item.href + '" class="parent-bottom-nav-btn' + active + '"' + aria + '>' +
        '<span class="parent-bottom-nav-icon" aria-hidden="true">' +
        (window.IconSystem ? IconSystem.forItem(iconItem, 28, 'app-icon app-icon--nav') : item.icon) +
        '</span>' +
        '<span>' + item.label + '</span></a>';
    }).join('');
    if (!nav.dataset.magicNavBound) {
      nav.dataset.magicNavBound = '1';
      nav.addEventListener('click', function (e) {
        const link = e.target.closest('a.parent-bottom-nav-btn');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href.charAt(0) !== '/') return;
        if (window.NavConfig && NavConfig.navigateHomeFromDailyLog(href, e)) return;
        const router = window.ParentMagicRouter;
        if (!router) return;
        if (typeof window.closeAllLibraryModals === 'function') closeAllLibraryModals();
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
    }
    nav.style.display = isMagic() ? 'flex' : '';
    if (isMagic() && window.ParentMagicRouter) {
      ParentMagicRouter.bind();
    }
  }

  function applyPageClasses(magic) {
    getNavItems().forEach(function (item) {
      document.body.classList.remove('parent-magic-page-' + item.id);
    });
    document.body.classList.toggle('parent-magic-view', magic);
    if (magic && _page) {
      document.body.classList.add('parent-magic-page-' + _page);
    }
    if (!magic) {
      document.body.classList.remove('magic-settings-in-group');
    }
  }

  function refresh() {
    const magic = isMagic();
    if (window.NativeDebug) {
      NativeDebug.log('magic_shell_refresh', { magic: magic, page: _page });
    }
    applyPageClasses(magic);
    if (magic) {
      ensureOrbs();
      renderBottomNav();
    } else {
      removeOrbs();
      if (!document.body.classList.contains('has-native-tab-bar')) {
        const nav = document.getElementById('parentBottomNav');
        if (nav && !document.body.classList.contains('parent-magic-dashboard') &&
            !document.body.classList.contains('parent-magic-library')) {
          nav.style.display = '';
        }
      }
    }
    if (window.ParentMagicPageHub) {
      ParentMagicPageHub.refresh(_page, magic);
    }
  }

  function navigateToPage(page) {
    _page = page || _page || 'dashboard';
    refresh();
    return Promise.resolve(isMagic());
  }

  function init(page) {
    if (_initPromise) return _initPromise;
    _page = page || 'dashboard';
    if (window.ParentMagicAuto) {
      ParentMagicAuto.prepareDom();
    }
    if (window.AppViewMode && AppViewMode.applyStoredParentModeOptimistic) {
      AppViewMode.applyStoredParentModeOptimistic();
    }
    if (!window.AppViewMode) {
      refresh();
      _initPromise = Promise.resolve(false);
      return _initPromise;
    }

    _initPromise = AppViewMode.initParent().then(function () {
      const toggleMount = document.getElementById('appViewToggleMount');
      if (toggleMount && AppViewMode.isAllowed()) {
        AppViewMode.mountToggle(toggleMount);
      } else if (toggleMount) {
        toggleMount.style.display = 'none';
      }
      AppViewMode.onChange(refresh);
      refresh();
      return isMagic();
    });
    return _initPromise;
  }

  window.addEventListener('stjarndag-parent-nav-layout', refresh);
  document.addEventListener('locale-changed', refresh);
  document.addEventListener('parent-i18n-ready', refresh);
  if (MOBILE_NAV_MQ) {
    const onMqChange = function () { refresh(); };
    if (typeof MOBILE_NAV_MQ.addEventListener === 'function') {
      MOBILE_NAV_MQ.addEventListener('change', onMqChange);
    } else if (typeof MOBILE_NAV_MQ.addListener === 'function') {
      MOBILE_NAV_MQ.addListener(onMqChange);
    }
  }

  window.ParentMagicShell = {
    init: init,
    refresh: refresh,
    isMagic: isMagic,
    navigateToPage: navigateToPage,
  };
})();
