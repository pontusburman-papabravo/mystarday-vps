/**
 * child-samling-view.js — Min samling (Fas B / #615).
 * Gate ON: ChildSamlingPresent shell. Ingen köp-UI i denna vy.
 */
(function () {
  'use strict';

  let _loaded = false;

  function render(universe) {
    const mount = document.getElementById('collectionViewMount');
    if (!mount) return;

    if (window.ChildSamlingPresent && typeof ChildSamlingPresent.render === 'function') {
      mount.innerHTML = ChildSamlingPresent.render(universe);
    } else {
      mount.innerHTML =
        '<div class="max-w-lg mx-auto px-4 pt-6 pb-8 text-center">' +
          '<p class="text-sm text-text-soft">Min samling laddas…</p>' +
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
      ChildUniverse.load(_loaded).then(function (universe) {
        if (loader) loader.classList.add('hidden');
        render(universe);
      }).catch(function () {
        if (loader) loader.classList.add('hidden');
        render(null);
      });
      return;
    }

    if (loader) loader.classList.add('hidden');
    render(null);
  }

  window.ChildSamlingView = {
    refresh: refresh,
  };
})();
