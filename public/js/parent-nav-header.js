/**
 * parent-nav-header.js — Header notifications link on parent pages (vuxenmeny v2).
 */
(function () {
  'use strict';

  if (!window.NavConfig) return;
  var path = NavConfig.normalizePath(window.location.pathname);
  if (path === '/login' || path === '/child-login' || path.indexOf('/admin') === 0) return;

  if (document.querySelector('[data-parent-nav-notifications]')) return;
  if (document.querySelector('a[href="/notifications"].parent-hub-icon-btn')) return;

  var main = document.querySelector('main') || document.querySelector('.flex-1') || document.body;
  var bar = document.createElement('div');
  bar.className = 'parent-nav-header-actions';
  bar.setAttribute('data-parent-nav-notifications', '1');
  bar.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;padding:8px 16px 0;max-width:100%;';
  bar.innerHTML =
    '<a href="/notifications" class="parent-hub-icon-btn min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/80 border border-lavender text-lg" aria-label="Notiser">🔔</a>';

  if (main && main.firstChild) {
    main.insertBefore(bar, main.firstChild);
  } else {
    document.body.insertBefore(bar, document.body.firstChild);
  }
})();
