/**
 * Lazy-load SortableJS for admin library / landing-news (not needed on Start).
 */
(function () {
  'use strict';

  const SORTABLE_CDN = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js';
  let loadPromise = null;

  function ensureAdminSortable() {
    if (typeof window.Sortable !== 'undefined') {
      return Promise.resolve(window.Sortable);
    }
    if (loadPromise) return loadPromise;
    loadPromise = new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = SORTABLE_CDN;
      script.async = true;
      script.onload = function () {
        if (typeof window.Sortable !== 'undefined') resolve(window.Sortable);
        else {
          loadPromise = null;
          reject(new Error('Sortable loaded but Sortable is undefined'));
        }
      };
      script.onerror = function () {
        loadPromise = null;
        reject(new Error('Sortable failed to load'));
      };
      document.head.appendChild(script);
    });
    return loadPromise;
  }

  window.ensureAdminSortable = ensureAdminSortable;
})();
