/**
 * child-samling-view.js — Min samling (Fas B–D / #615).
 * Gate ON: ChildSamlingPresent + reward memories (read-only GET /api/me/rewards).
 */
(function () {
  'use strict';

  let _loaded = false;
  let _lastUniverse = null;
  let _lastRedemptions = null;
  let _inflight = null;

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
    } else {
      mount.innerHTML =
        '<div class="max-w-lg mx-auto px-4 pt-6 pb-8 text-center">' +
          '<p class="text-sm text-text-soft">Ett ögonblick…</p>' +
        '</div>';
    }
    _loaded = true;
    _lastUniverse = universe;
    _lastRedemptions = redemptions;
  }

  function showCachedIfReady(loader) {
    if (!_loaded || _lastUniverse == null) return false;
    const mount = document.getElementById('collectionViewMount');
    if (!mount || !mount.childElementCount) return false;
    if (loader) loader.classList.add('hidden');
    return true;
  }

  function refresh(options) {
    options = options || {};
    const loader = document.getElementById('collectionViewLoading');
    const mount = document.getElementById('collectionViewMount');

    if (!options.force && showCachedIfReady(loader)) {
      return Promise.resolve();
    }

    if (_inflight && !options.force) {
      return _inflight;
    }

    if (loader) loader.classList.remove('hidden');
    if (mount && options.force) mount.innerHTML = '';

    if (!window.ChildUniverse || typeof ChildUniverse.load !== 'function') {
      console.warn('[ChildSamlingView] ChildUniverse unavailable — cannot load star stats');
      if (loader) loader.classList.add('hidden');
      if (_lastUniverse) {
        render(_lastUniverse, _lastRedemptions || []);
        return Promise.resolve();
      }
      render(null, []);
      return Promise.resolve();
    }

    const universeP = ChildUniverse.load(!!options.force || !_loaded);
    const redemptionsP = loadRewardRedemptions();
    _inflight = Promise.all([universeP, redemptionsP]).then(function (results) {
      if (loader) loader.classList.add('hidden');
      render(results[0], results[1]);
    }).catch(function (err) {
      console.warn('[ChildSamlingView] refresh failed:', err);
      if (loader) loader.classList.add('hidden');
      if (_lastUniverse) {
        render(_lastUniverse, _lastRedemptions || []);
      } else {
        render(null, []);
      }
    }).finally(function () {
      _inflight = null;
    });

    return _inflight;
  }

  window.ChildSamlingView = {
    refresh: refresh,
    invalidate: function () {
      _loaded = false;
      _lastUniverse = null;
      _lastRedemptions = null;
      if (window.ChildUniverse && ChildUniverse.invalidate) ChildUniverse.invalidate();
    },
  };
})();
