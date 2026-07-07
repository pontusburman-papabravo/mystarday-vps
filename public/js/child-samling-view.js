/**
 * child-samling-view.js — Min samling placeholder (Fas A / #588).
 * Reuses ChildAchievements + ChildCollections when universe data exists.
 */
(function () {
  'use strict';

  let _loaded = false;

  function placeholderHtml() {
    return (
      '<div class="max-w-lg mx-auto px-4 pt-6 pb-8">' +
        '<div class="text-center mb-6">' +
          '<p class="text-5xl mb-3" aria-hidden="true">🏆</p>' +
          '<h2 class="text-xl font-heading font-bold text-navy mb-2">Min samling</h2>' +
          '<p class="text-sm text-text-soft leading-relaxed">' +
            'Här samlar du det du är stolt över — trofeer, minnen och stjärnor du tjänat. ' +
            'Mer kommer snart!' +
          '</p>' +
        '</div>' +
        '<div class="bg-sky/60 rounded-2xl border border-lavender p-5 text-center">' +
          '<p class="text-sm text-navy/80 font-semibold">Fortsätt med dagens rutiner i ☀️ Idag</p>' +
          '<p class="text-xs text-text-soft mt-2">Dina prestationer dyker upp här när du samlar mer.</p>' +
        '</div>' +
      '</div>'
    );
  }

  function render(universe) {
    const mount = document.getElementById('collectionViewMount');
    if (!mount) return;

    const hasAchievements = !!(universe && universe.achievements && universe.achievements.length);
    const hasCollectibles = !!(universe && universe.collectibles && universe.collectibles.length);

    if (!hasAchievements && !hasCollectibles) {
      mount.innerHTML = placeholderHtml();
      _loaded = true;
      return;
    }

    let html = '<div class="max-w-lg mx-auto px-4 pt-4 pb-8">';
    html += '<div class="mb-4 text-center">' +
      '<h2 class="text-lg font-heading font-bold text-navy">Min samling</h2>' +
      '<p class="text-xs text-text-soft mt-1">Titta vad du har samlat</p></div>';

    if (hasAchievements && window.ChildAchievements) {
      html += ChildAchievements.renderRoom(universe);
    }
    if (window.ChildCollections) {
      html += ChildCollections.renderRoom(universe || { collectibles: [], catalog: [] });
    }

    html += '</div>';
    mount.innerHTML = html;
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
