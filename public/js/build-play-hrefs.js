/**
 * build-play-hrefs.js — Klientlänkar till lek-världar (speglar src/lib/build-world-play.js)
 */
(function () {
  'use strict';

  var PLAY_SLUGS = ['husdjur', 'dinosaurie', 'dockhus', 'fiske', 'laxor', 'vardag'];

  function playHrefForSlug(slug) {
    if (slug === 'racerbil') return '/child/garage';
    if (PLAY_SLUGS.indexOf(slug) >= 0) return '/child/play/' + slug;
    return '/child/world';
  }

  window.BuildPlayHrefs = { playHrefForSlug: playHrefForSlug };
})();
