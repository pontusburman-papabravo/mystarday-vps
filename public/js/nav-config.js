/**
 * nav-config.js — Single source of truth for parent primary navigation (vuxenmeny v2).
 * Consumers: native-tab-bar.js, parent-magic-shell.js, parent-nav-sidebar.js
 */
(function () {
  'use strict';

  /** Primary nav: not feature-gated (for_dig is basic_app — always visible). */
  const PRIMARY_NAV = [
    {
      id: 'home',
      href: '/dashboard',
      label: 'Hem',
      labelKey: 'nav.primary.home',
      icon: 'hem',
      paths: ['/dashboard', '/daily-log'],
    },
    {
      id: 'planning',
      href: '/planning',
      label: 'Planering',
      labelKey: 'nav.primary.planning',
      icon: 'schema',
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
      labelKey: 'nav.primary.rewards',
      icon: 'beloningar',
      paths: ['/rewards', '/skattkammaren-parent'],
    },
    {
      id: 'for_you',
      href: '/for-dig',
      label: 'För dig',
      labelKey: 'nav.primary.forYou',
      icon: 'for-dig',
      paths: ['/for-dig'],
    },
    {
      id: 'family',
      href: '/family',
      label: 'Familj',
      labelKey: 'nav.primary.family',
      icon: 'familj',
      paths: ['/family', '/family/child'],
    },
  ];

  const SETTINGS_NAV = {
    id: 'settings',
    href: '/settings',
    label: 'Inställningar',
    labelKey: 'nav.settings',
    icon: 'installningar',
    paths: ['/settings', '/upgrade', '/payment-success', '/child-settings'],
  };

  const HEADER_ACTIONS = [
    { id: 'notifications', href: '/notifications', icon: 'notiser', label: 'Notiser' },
    { id: 'settings', href: '/settings', icon: 'installningar', label: 'Inställningar' },
    { id: 'tipsa', action: 'tipsa', icon: 'tipsa', label: 'Tipsa' },
  ];

  /** Capability placements — feature-gated deep links (vuxenmeny v2 Sprint 6). */
  const CAPABILITIES = [
    {
      id: 'subscription',
      label: 'Prenumeration',
      feature: null,
      domain: 'billing',
      href: '/settings#prenumeration',
      placements: ['settings_subscription', 'home_card', 'avatar_action'],
    },
    {
      id: 'reports',
      label: 'Rapporter',
      feature: 'reporting',
      domain: 'child_progress',
      href: '/reports',
      placements: ['planning_hub', 'child_profile', 'rewards_hub', 'home_card'],
    },
    {
      id: 'samarbete',
      label: 'Pedagogsamarbete',
      feature: 'pedagog',
      domain: 'family',
      href: '/samarbete',
      placements: ['planning_hub', 'family_pedagog_interest', 'for_you_card'],
    },
    {
      id: 'barn_stod',
      label: 'Extra stöd',
      feature: 'teacch',
      domain: 'child_progress',
      href: '/barn-stod',
      placements: ['planning_hub'],
    },
  ];

  const AVATAR_ACTIONS = [
    {
      id: 'switch_pedagog',
      label: 'Byt till pedagogvy',
      feature: 'pedagog',
      role: 'dual_or_educator',
    },
    {
      id: 'subscription',
      label: 'Prenumeration',
      href: '/settings#prenumeration',
      placement: 'avatar_action',
    },
    { id: 'settings', href: '/settings', label: 'Inställningar' },
    { id: 'logout', action: 'logout', label: 'Logga ut' },
  ];

  function hasFeatureAccess(access, featureSlug) {
    if (!featureSlug) return true;
    if (!access || !access.features) return false;
    return access.features[featureSlug] === true;
  }

  function visibleAtPlacement(capability, access, visibility, placement) {
    if (!capability.placements || capability.placements.indexOf(placement) === -1) return false;
    if (!hasFeatureAccess(access, capability.feature)) return false;
    if (visibility && visibility[placement] === false) return false;
    return true;
  }

  function capabilitiesForPlacement(access, visibility, placement) {
    return CAPABILITIES.filter(function (c) {
      return visibleAtPlacement(c, access, visibility, placement);
    });
  }

  function normalizePath(pathname) {
    let p = (pathname || '/').replace(/\/$/, '') || '/';
    if (p.endsWith('.html')) p = p.slice(0, -5);
    return p;
  }

  /** Active primary tab — same logic for bottom nav, magic shell, sidebar. */
  function libraryHashNavOverride(pathname) {
    if (normalizePath(pathname) !== '/library') return null;
    if (typeof window === 'undefined' || !window.location) return null;
    const hash = (window.location.hash || '').replace('#', '');
    if (hash === 'magic-rewards') {
      for (let i = 0; i < PRIMARY_NAV.length; i++) {
        if (PRIMARY_NAV[i].id === 'rewards') return PRIMARY_NAV[i];
      }
    }
    return null;
  }

  function activeNavItem(pathname, nav) {
    const hashOverride = libraryHashNavOverride(pathname);
    if (hashOverride) return hashOverride;
    const list = nav || PRIMARY_NAV;
    const p = normalizePath(pathname);
    for (let i = 0; i < list.length; i++) {
      const tab = list[i];
      if (!tab.paths) continue;
      for (let j = 0; j < tab.paths.length; j++) {
        const tp = tab.paths[j];
        if (p === tp) return tab;
        if (tp === '/dashboard' && p.indexOf('/daily') === 0) return tab;
        if (tp === '/family/child' && p.indexOf('/family/child/') === 0) return tab;
        if (tp !== '/' && p.indexOf(tp + '/') === 0) return tab;
      }
    }
    return null;
  }

  /** Capability / deep-link pages that keep parent shell but are not primary tabs. */
  const PARENT_SHELL_PATHS = [
    '/reports',
    '/samarbete',
    '/pedagog-note',
    '/pedagog-oversikt',
    '/notifications',
    '/upgrade',
    '/child-settings',
    '/skattkammaren',
  ];

  function isLibraryPath(pathname) {
    return normalizePath(pathname) === '/library';
  }

  function isParentShellPath(pathname) {
    const p = normalizePath(pathname);
    if (activeNavItem(p)) return true;
    for (let i = 0; i < PARENT_SHELL_PATHS.length; i++) {
      const hp = PARENT_SHELL_PATHS[i];
      if (p === hp || p.indexOf(hp + '/') === 0) return true;
    }
    if (p.indexOf('/family/child/') === 0) return true;
    return false;
  }

  function resolveLabel(item) {
    if (!item) return '';
    if (item.labelKey && typeof window.pt === 'function') {
      const translated = window.pt(item.labelKey);
      if (translated && translated !== item.labelKey) return translated;
    }
    return item.label || '';
  }

  function primaryNavForTabs() {
    return PRIMARY_NAV.map(function (item) {
      return {
        href: item.href,
        label: resolveLabel(item),
        labelKey: item.labelKey,
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
    CAPABILITIES: CAPABILITIES,
    AVATAR_ACTIONS: AVATAR_ACTIONS,
    activeNavItem: activeNavItem,
    normalizePath: normalizePath,
    isLibraryPath: isLibraryPath,
    isParentShellPath: isParentShellPath,
    resolveLabel: resolveLabel,
    primaryNavForTabs: primaryNavForTabs,
    hasFeatureAccess: hasFeatureAccess,
    visibleAtPlacement: visibleAtPlacement,
    capabilitiesForPlacement: capabilitiesForPlacement,
  };
})();
