/**
 * child-samling-view.js — Min samling (Fas B–D / #615).
 * Gate ON: ChildSamlingPresent + reward memories (read-only GET /api/me/rewards).
 */
(function () {
  'use strict';

  let _loaded = false;

  function loadRewardRedemptions() {
    if (typeof Auth === 'undefined' || !Auth.api) {
      return Promise.resolve([]);
    }
    return Auth.api('/api/me/rewards')
      .then(function (data) {
        return (data && data.redemptions) ? data.redemptions : [];
      })
      .catch(function () {
        return [];
      });
  }

  function render(universe, redemptions) {
    const mount = document.getElementById('collectionViewMount');
    if (!mount) return;

    if (window.ChildSamlingPresent && typeof ChildSamlingPresent.render === 'function') {
      mount.innerHTML = ChildSamlingPresent.render(universe, { redemptions: redemptions });
      if (typeof ChildSamlingPresent.bindInteractions === 'function') {
        ChildSamlingPresent.bindInteractions(mount);
      }
      if (window.ChildThemePicker && typeof ChildThemePicker.bindEntry === 'function') {
        ChildThemePicker.bindEntry(mount);
      }
    } else {
      mount.innerHTML =
        '<div class="max-w-lg mx-auto px-4 pt-6 pb-8 text-center">' +
          '<p class="text-sm text-text-soft">Ett ögonblick…</p>' +
        '</div>';
    }
    _loaded = true;
  }

  function refresh() {
    const loader = document.getElementById('collectionViewLoading');
    const mount = document.getElementById('collectionViewMount');
    if (loader) loader.classList.remove('hidden');
    if (mount) mount.innerHTML = '';

    if (window.ChildUniverse && typeof ChildUniverse.load === 'function') {
      const universeP = ChildUniverse.load(_loaded);
      const redemptionsP = loadRewardRedemptions();
      Promise.all([universeP, redemptionsP]).then(function (results) {
        if (loader) loader.classList.add('hidden');
        render(results[0], results[1]);
      }).catch(function () {
        if (loader) loader.classList.add('hidden');
        render(null, []);
      });
      return;
    }

    if (loader) loader.classList.add('hidden');
    render(null, []);
  }

  window.ChildSamlingView = {
    refresh: refresh,
  };
})();
