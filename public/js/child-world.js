/**
 * child-world.js — Min värld shell (barnmeny v2 Sprint 2).
 */
(function () {
  'use strict';

  function onEnter() {
    if (typeof window.showTab === 'function') window.showTab('rewards');
    if (window.ChildRewardsEngine) {
      ChildRewardsEngine.refreshRewards().then(function () {
        if (ChildRewardsEngine.isWorldSceneActive && ChildRewardsEngine.isWorldSceneActive()) {
          if (typeof ChildRewardsEngine.clearGoalChrome === 'function') {
            ChildRewardsEngine.clearGoalChrome();
          }
          return;
        }
        ChildRewardsEngine.mountGoalProgress();
        ChildRewardsEngine.mountPendingBannerIfNeeded();
      });
    }
    if (!window.ChildMorgonhus && window.ChildSkattHouse && typeof ChildSkattHouse.showHub === 'function') {
      ChildSkattHouse.showHub();
    }
  }

  window.ChildWorld = { onEnter: onEnter };
})();
