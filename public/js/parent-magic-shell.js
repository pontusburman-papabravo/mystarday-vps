/**
 * parent-magic-shell.js — Shared magic init: toggle, 3D orbs, bottom nav, page class.
 * Bottom nav reads NavConfig (vuxenmeny v2).
 */
(function () {
  'use strict';

  var _page = null;

  function getNavItems() {
    if (window.NavConfig && NavConfig.PRIMARY_NAV) {
      return NavConfig.PRIMARY_NAV;
    }
    return [];
  }

  function isMagic() {
    return window.AppViewMode && AppViewMode.isAllowed() && AppViewMode.isMagic();
  }

  function ensureOrbs() {
    if (document.querySelector('.magic-3d-orbs')) return;
    var wrap = document.createElement('div');
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
    var el = document.querySelector('.magic-3d-orbs');
    if (el) el.remove();
  }

  function activeNavId() {
    if (window.NavConfig && NavConfig.activeNavItem) {
      var item = NavConfig.activeNavItem(window.location.pathname);
      if (item) return item.id;
    }
    return _page;
  }

  function renderBottomNav() {
    if (document.body.classList.contains('has-native-tab-bar') || document.querySelector('.native-tab-bar')) {
      var hidden = document.getElementById('parentBottomNav');
      if (hidden) hidden.style.display = 'none';
      return;
    }
    var nav = document.getElementById('parentBottomNav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'parentBottomNav';
      nav.className = 'parent-bottom-nav';
      nav.setAttribute('role', 'navigation');
      nav.setAttribute('aria-label', 'Huvudnavigering');
      document.body.appendChild(nav);
    }
    var activeId = activeNavId();
    var items = getNavItems();
    nav.innerHTML = items.map(function (item) {
      var active = item.id === activeId ? ' is-active' : '';
      var aria = item.id === activeId ? ' aria-current="page"' : '';
      return '<a href="' + item.href + '" class="parent-bottom-nav-btn' + active + '"' + aria + '>' +
        '<span class="parent-bottom-nav-icon" aria-hidden="true">' + item.icon + '</span>' +
        '<span>' + item.label + '</span></a>';
    }).join('');
    nav.style.display = isMagic() ? 'flex' : '';
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
    var magic = isMagic();
    applyPageClasses(magic);
    if (magic) {
      ensureOrbs();
      renderBottomNav();
    } else {
      removeOrbs();
      if (!document.body.classList.contains('has-native-tab-bar')) {
        var nav = document.getElementById('parentBottomNav');
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

  function init(page) {
    _page = page || 'dashboard';
    if (window.ParentMagicAuto) {
      ParentMagicAuto.prepareDom();
    }
    if (!window.AppViewMode) {
      refresh();
      return Promise.resolve(false);
    }

    return AppViewMode.initParent().then(function () {
      var toggleMount = document.getElementById('appViewToggleMount');
      if (toggleMount && AppViewMode.isAllowed()) {
        AppViewMode.mountToggle(toggleMount);
      } else if (toggleMount) {
        toggleMount.style.display = 'none';
      }
      AppViewMode.onChange(refresh);
      refresh();
      return isMagic();
    });
  }

  window.ParentMagicShell = {
    init: init,
    refresh: refresh,
    isMagic: isMagic,
  };
})();
