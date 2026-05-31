/**
 * platform-tab-bar.js — Native iOS tab bar replacing hamburger menu.
 *
 * Runs on DOMContentLoaded. Only executes inside Capacitor native shell
 * (when <html> has .platform-native). Shows on parent pages with sidebar
 * only — NOT on child view, login, register, onboarding, verify-email, etc.
 *
 * WHAT: injects a fixed bottom tab bar with iOS-style styling.
 * WHAT NOT: does NOT modify hamburger/mobile-nav.js (that is hidden via CSS).
 */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  // Only run inside Capacitor native shell
  var html = document.documentElement;
  if (!html.classList.contains('platform-native')) return;

  // ── Guard: only show on parent pages with sidebar ────────────────────────
  // Pages with hamburger use mobile-nav.js; without sidebar the guard catches login/register/onboarding/etc.
  var hasSidebar =
    document.getElementById('sidebar') ||
    document.querySelector('nav.bg-navy');
  if (!hasSidebar) return;

  // ── Tab definitions ───────────────────────────────────────────────────────
  var TABS = [
    { href: '/dashboard', label: 'Hem',   icon: '🏠', paths: ['/dashboard', '/daily-log', '/'] },
    { href: '/schedule',  label: 'Schema', icon: '📅', paths: ['/schedule', '/calendar', '/activities', '/assign-schedule'] },
    { href: '/skattkammaren', label: 'Skatt', icon: '🏆', paths: ['/skattkammaren'] },
    { href: '/family',    label: 'Mer',   icon: '⚙️', paths: ['/family', '/settings', '/library', '/reports', '/pedagog-note'] },
  ];

  // ── Active matching ──────────────────────────────────────────────────────
  function isActive(tab) {
    var path = (window.location.pathname || '/').replace(/\/$/, '') || '/';
    for (var i = 0; i < tab.paths.length; i++) {
      if (path === tab.paths[i]) return true;
      // /dashboard matches sub-pages like /daily-log
      if (tab.paths[i] === '/dashboard' && path.startsWith('/daily')) return true;
    }
    return false;
  }

  // ── Build tab bar HTML ────────────────────────────────────────────────────
  var activeFound = false;
  var itemsHtml = '';
  for (var j = 0; j < TABS.length; j++) {
    var tab = TABS[j];
    var active = isActive(tab);
    if (active) activeFound = true;
    itemsHtml +=
      '<a href="' + tab.href + '" class="tab-item' + (active ? ' active' : '') + '">' +
        '<span class="tab-icon">' + tab.icon + '</span>' +
        '<span class="tab-label">' + tab.label + '</span>' +
      '</a>';
  }

  var nav = document.createElement('nav');
  nav.className = 'native-tab-bar';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Huvudmeny');
  nav.innerHTML = itemsHtml;

  // Inject at end of <body>
  var body = document.body;
  if (body) {
    body.appendChild(nav);
  }
})();