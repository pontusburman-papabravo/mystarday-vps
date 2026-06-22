/**
 * parent-magic-auto.js — Resolve magic page id from URL + prepare DOM on parent shells.
 */
(function () {
  'use strict';

  var PATH_PAGES = {
    '/dashboard': 'dashboard',
    '/daily-log': 'daily-log',
    '/planning': 'planning',
    '/schedule': 'schedule',
    '/calendar': 'calendar',
    '/activities': 'activities',
    '/assign-schedule': 'assign-schedule',
    '/for-dig': 'for-dig',
    '/rewards': 'rewards',
    '/family': 'family',
    '/settings': 'settings',
    '/library': 'library',
    '/skattkammaren': 'skattkammaren',
    '/child-settings': 'child-settings',
    '/notifications': 'notifications',
  };

  function normalizePath(path) {
    var p = (path || '/').replace(/\/$/, '') || '/';
    if (p.endsWith('.html')) p = p.slice(0, -5);
    return p;
  }

  function resolvePage(pathname) {
    var p = normalizePath(pathname || window.location.pathname);
    return PATH_PAGES[p] || null;
  }

  function isParentShellPage(pathname) {
    return !!resolvePage(pathname);
  }

  function markLegacyChrome() {
    var selectors = [
      '#sidebar',
      'nav#sidebar',
      'nav.bg-navy',
      'nav.w-full.md\\:w-64',
      '.md\\:hidden.bg-navy.sticky',
      '.mobile-topbar',
    ];
    selectors.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (el) {
          el.classList.add('parent-magic-legacy-hide');
        });
      } catch (_) {}
    });
  }

  function ensureMount(id, className) {
    if (document.getElementById(id)) return;
    var el = document.createElement('div');
    el.id = id;
    if (className) el.className = className;
    var main = document.querySelector('main') || document.body;
    main.insertBefore(el, main.firstChild);
  }

  function prepareDom() {
    markLegacyChrome();
    ensureMount('appViewToggleMount', 'app-view-toggle-wrap');
    ensureMount('parentMagicPageMount', 'hidden');
    var hub = document.getElementById('parentMagicPageMount');
    if (hub) hub.setAttribute('aria-live', 'polite');
  }

  window.ParentMagicAuto = {
    resolvePage: resolvePage,
    isParentShellPage: isParentShellPage,
    prepareDom: prepareDom,
    PATH_PAGES: PATH_PAGES,
  };
})();
