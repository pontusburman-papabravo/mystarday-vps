/**
 * parent-nav-header.js — Header notifications link on parent pages (vuxenmeny v2).
 * Avatar menu is handled by parent-avatar-menu.js (same header bar).
 */
(function () {
  'use strict';

  if (!window.NavConfig) return;
  var path = NavConfig.normalizePath(window.location.pathname);
  if (path === '/login' || path === '/child-login' || path.indexOf('/admin') === 0) return;
  if (!NavConfig.isParentShellPath(path) && path !== '/settings') return;

  if (document.querySelector('[data-parent-nav-notifications]') || document.querySelector('[data-parent-nav-header]')) {
    return;
  }

  var main = document.querySelector('main') || document.querySelector('.flex-1') || document.body;
  var bar = document.createElement('div');
  bar.className = 'parent-nav-header-actions';
  bar.setAttribute('data-parent-nav-header', '1');
  bar.innerHTML =
    '<a href="/notifications" class="parent-hub-icon-btn min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/80 border border-lavender text-lg" aria-label="Notiser" data-parent-nav-notifications="1">🔔</a>';

  if (main && main.firstChild) {
    main.insertBefore(bar, main.firstChild);
  } else {
    document.body.insertBefore(bar, document.body.firstChild);
  }

  if (window.ParentMagicAuto && ParentMagicAuto.ensureTopChrome) {
    ParentMagicAuto.ensureTopChrome();
  }
})();
