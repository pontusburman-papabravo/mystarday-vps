/**
 * parent-magic-auto.js — Resolve magic page id from URL + prepare DOM on parent shells.
 */
(function () {
  'use strict';

  const PATH_PAGES = {
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
    let p = (path || '/').replace(/\/$/, '') || '/';
    if (p.endsWith('.html')) p = p.slice(0, -5);
    return p;
  }

  function resolvePage(pathname) {
    const p = normalizePath(pathname || window.location.pathname);
    // Per-child settings page carries an id segment (/family/child/<id>).
    if (p.indexOf('/family/child/') === 0) return 'family-child';
    return PATH_PAGES[p] || null;
  }

  function isParentShellPage(pathname) {
    return !!resolvePage(pathname);
  }

  function markLegacyChrome() {
    const selectors = [
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
    const el = document.createElement('div');
    el.id = id;
    if (className) el.className = className;
    const main = document.querySelector('main') || document.body;
    main.insertBefore(el, main.firstChild);
  }

  /** One flex row: view toggle + notis/avatar (reliable on iPhone + iPad). */
  function ensureTopChrome() {
    const toggle = document.getElementById('appViewToggleMount');
    const navHeader = document.querySelector('[data-parent-nav-header]');
    const main = document.querySelector('main') || document.body;

    if (!navHeader) return;

    let chrome = document.getElementById('parentTopChrome');
    if (!chrome) {
      chrome = document.createElement('div');
      chrome.id = 'parentTopChrome';
      chrome.className = 'parent-top-chrome';
      const anchor = toggle && toggle.parentNode === main ? toggle : navHeader;
      main.insertBefore(chrome, anchor);
    }

    if (toggle && toggle.parentNode !== chrome) chrome.appendChild(toggle);
    if (navHeader.parentNode !== chrome) chrome.appendChild(navHeader);
  }

  function prepareDom() {
    markLegacyChrome();
    ensureMount('appViewToggleMount', 'app-view-toggle-wrap');
    ensureMount('parentMagicPageMount', 'hidden');
    const hub = document.getElementById('parentMagicPageMount');
    if (hub) hub.setAttribute('aria-live', 'polite');
    ensureTopChrome();
  }

  window.ParentMagicAuto = {
    resolvePage: resolvePage,
    isParentShellPage: isParentShellPage,
    prepareDom: prepareDom,
    ensureTopChrome: ensureTopChrome,
    PATH_PAGES: PATH_PAGES,
  };

  window.addEventListener('stjarndag-magic-navigated', function () {
    ensureTopChrome();
  });
})();
