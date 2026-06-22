/**
 * child-world.js — Min värld shell (barnmeny v2 Sprint 2).
 */
(function () {
  'use strict';

  function onEnter() {
    if (typeof window.showTab === 'function') window.showTab('rewards');
    if (window.ChildRewardsEngine) ChildRewardsEngine.ensureLoaded();
    if (window.ChildSkattHouse && typeof ChildSkattHouse.showHub === 'function') {
      ChildSkattHouse.showHub();
    }
  }

  window.ChildWorld = { onEnter: onEnter };
})();
