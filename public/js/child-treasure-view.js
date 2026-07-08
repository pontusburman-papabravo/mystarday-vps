/**
 * child-treasure-view.js — Skattkammaren egen flik (Fas A / #591).
 * Thin entry: routes to existing loadRewards/renderSkattkammaren — no reward logic here.
 */
(function () {
  'use strict';

  function isGateOn() {
    return !!(window.ChildWorlds
      && ChildWorlds.isBarnetsSamlingEnabled
      && ChildWorlds.isBarnetsSamlingEnabled());
  }

  function loadOptions(options) {
    const opts = Object.assign({}, options || {});
    if (isGateOn()) {
      opts.skipHub = true;
      if (window.ChildWorlds && typeof ChildWorlds.deactivateWorldSubScenes === 'function') {
        ChildWorlds.deactivateWorldSubScenes();
      }
      if (window.ChildWorlds && typeof ChildWorlds.syncTreasurePath === 'function') {
        ChildWorlds.syncTreasurePath();
      }
    }
    return opts;
  }

  function refresh(options) {
    if (typeof window.loadRewards !== 'function') return Promise.resolve();
    return window.loadRewards(loadOptions(options));
  }

  function onEnter() {
    if (isGateOn() && window.ChildWorlds && typeof ChildWorlds.syncTreasurePath === 'function') {
      ChildWorlds.syncTreasurePath();
    }
    return refresh({ force: true });
  }

  window.ChildTreasureView = {
    refresh: refresh,
    onEnter: onEnter,
    isGateOn: isGateOn,
  };
})();
