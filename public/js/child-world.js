/**
 * child-world.js — Min värld shell (barnmeny v2 Sprint 2).
 */
(function () {
  'use strict';

  function onEnter() {
    if (typeof window.showTab === 'function') window.showTab('rewards');
    if (window.ChildRewardsEngine) {
      ChildRewardsEngine.refreshRewards().then(function () {
        ChildRewardsEngine.mountGoalProgress();
        ChildRewardsEngine.mountPendingBannerIfNeeded();
        if (window.ChildWorldMap) {
          ChildWorldMap.refresh(document.getElementById('skattkammarView'));
        }
      });
    }
    if (window.ChildSkattHouse && typeof ChildSkattHouse.showHub === 'function') {
      ChildSkattHouse.showHub();
    }
    if (window.ChildWorldMap) {
      ChildWorldMap.refresh(document.getElementById('skattkammarView'));
    }
  }

  window.ChildWorld = { onEnter: onEnter };
})();
