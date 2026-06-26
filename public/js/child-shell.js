/**
 * child-shell.js — Barn app orchestrator (barnmeny v2 Sprint 2).
 * Owns: route detection, nav bootstrap, module wiring. Business logic stays in engines/dashboard.
 */
(function () {
  'use strict';

  function trackPageView(worldId) {
    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event_type: 'child_world_view',
          metadata: { world: worldId, path: window.location.pathname },
        }),
      });
    } catch (_) { /* silent */ }
  }

  function detectWorldFromPath() {
    if (!window.ChildWorlds) return 'today';
    const active = ChildWorlds.activeChildNavItem(
      window.location.pathname,
      window.location.hash
    );
    return active ? active.id : 'today';
  }

  function bootstrapModules(worldId) {
    if (window.ChildToday && worldId === 'today') ChildToday.onEnter();
    if (window.ChildWorld && worldId === 'world') ChildWorld.onEnter();
    if (window.ChildFamilyWorld && worldId === 'family') ChildFamilyWorld.onEnter();
  }

  function init() {
    if (!window.ChildWorlds || !ChildWorlds.V2_ENABLED) return;

    const worldId = detectWorldFromPath();
    document.documentElement.setAttribute('data-child-world-active', worldId);

    if (window.ChildWorldsNav) ChildWorldsNav.renderBottomNav();
    if (window.ChildSystemMenu) ChildSystemMenu.mount();

    bootstrapModules(worldId);
    trackPageView(worldId);
  }

  window.ChildShell = {
    init: init,
    detectWorldFromPath: detectWorldFromPath,
    bootstrapModules: bootstrapModules,
    trackPageView: trackPageView,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
