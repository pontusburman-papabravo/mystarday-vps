/**
 * child-rewards-engine.js — Stars, goals, redemptions facade (barnmeny v2 Sprint 2).
 */
(function () {
  'use strict';

  function ensureLoaded() {
    if (typeof window.loadRewards === 'function') {
      return window.loadRewards();
    }
    return Promise.resolve();
  }

  window.ChildRewardsEngine = {
    ensureLoaded: ensureLoaded,
  };
})();
