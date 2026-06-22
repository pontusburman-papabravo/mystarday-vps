/**
 * nav-config.js — Single source of truth for parent primary navigation (vuxenmeny v2).
 * Consumers: native-tab-bar.js, parent-magic-shell.js, parent-nav-sidebar.js
 */
(function () {
  'use strict';

  /** Primärnav: not feature-gated (for_dig is basic_app — always visible). */
  var PRIMARY_NAV = [
    {
      id: 'home',
      href: '/dashboard',
      label: 'Hem',
      icon: '🏠',
      paths: ['/dashboard', '/daily-log', '/'],
    },
    {
      id: 'planning',
      href: '/planning',
      label: 'Planering',
      icon: '📅',
      paths: [
        '/planning',
        '/schedule',
        '/calendar',
        '/activities',
        '/assign-schedule',
        '/library',
        '/barn-stod',
      ],
    },
    {
      id: 'rewards',
      href: '/rewards',
      label: 'Belöningar',
      icon: '🎁',
      paths: ['/rewards', '/skattkammaren-parent'],
    },
    {
      id: 'for_you',
      href: '/for-dig',
      label: 'För dig',
      icon: '✨',
      paths: ['/for-dig'],
    },
    {
      id: 'family',
      href: '/family',
      label: 'Familj',
      icon: '👨‍👩‍👧',
      paths: ['/family', '/family/child'],
    },
  ];

  var SETTINGS_NAV = {
    id: 'settings',
    href: '/settings',
    label: 'Inställningar',
    icon: '⚙️',
    paths: ['/settings', '/upgrade', '/payment-success', '/child-settings'],
  };

  var HEADER_ACTIONS = [
    { id: 'notifications', href: '/notifications', icon: '🔔', label: 'Notiser' },
  ];

  function normalizePath(pathname) {
    var p = (pathname || '/').replace(/\/$/, '') || '/';
    if (p.endsWith('.html')) p = p.slice(0, -5);
    return p;
  }

  /** Active primary tab — same logic for bottom nav, magic shell, sidebar. */
  function activeNavItem(pathname, nav) {
    var list = nav || PRIMARY_NAV;
    var p = normalizePath(pathname);
    for (var i = 0; i < list.length; i++) {
      var tab = list[i];
      if (!tab.paths) continue;
      for (var j = 0; j < tab.paths.length; j++) {
        var tp = tab.paths[j];
        if (p === tp) return tab;
        if (tp === '/dashboard' && p.indexOf('/daily') === 0) return tab;
        if (tp === '/family/child' && p.indexOf('/family/child/') === 0) return tab;
        if (tp !== '/' && p.indexOf(tp + '/') === 0) return tab;
      }
    }
    return null;
  }

  /** Capability / deep-link pages that keep parent shell but are not primary tabs. */
  var PARENT_SHELL_PATHS = [
    '/reports',
    '/samarbete',
    '/pedagog-note',
    '/pedagog-oversikt',
    '/notifications',
    '/upgrade',
    '/child-settings',
    '/skattkammaren',
  ];

  function isParentShellPath(pathname) {
    var p = normalizePath(pathname);
    if (activeNavItem(p)) return true;
    for (var i = 0; i < PARENT_SHELL_PATHS.length; i++) {
      var hp = PARENT_SHELL_PATHS[i];
      if (p === hp || p.indexOf(hp + '/') === 0) return true;
    }
    if (p.indexOf('/family/child/') === 0) return true;
    return false;
  }

  function primaryNavForTabs() {
    return PRIMARY_NAV.map(function (item) {
      return {
        href: item.href,
        label: item.label,
        icon: item.icon,
        paths: item.paths,
        id: item.id,
      };
    });
  }

  window.NavConfig = {
    PRIMARY_NAV: PRIMARY_NAV,
    SETTINGS_NAV: SETTINGS_NAV,
    HEADER_ACTIONS: HEADER_ACTIONS,
    activeNavItem: activeNavItem,
    normalizePath: normalizePath,
    isParentShellPath: isParentShellPath,
    primaryNavForTabs: primaryNavForTabs,
  };
})();
