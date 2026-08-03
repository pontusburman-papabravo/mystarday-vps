/**
 * Lazy-load Chart.js for admin (analytics, ärenden, journey, surveys).
 * Avoids parsing ~200KB Chart.umd on every /admin cold load.
 */
(function () {
  'use strict';

  var CHART_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  var loadPromise = null;

  function ensureAdminChartJs() {
    if (typeof window.Chart !== 'undefined') {
      return Promise.resolve(window.Chart);
    }
    if (loadPromise) return loadPromise;
    loadPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = CHART_CDN;
      script.async = true;
      script.onload = function () {
        if (typeof window.Chart !== 'undefined') resolve(window.Chart);
        else {
          loadPromise = null;
          reject(new Error('Chart.js loaded but Chart is undefined'));
        }
      };
      script.onerror = function () {
        loadPromise = null;
        reject(new Error('Chart.js failed to load'));
      };
      document.head.appendChild(script);
    });
    return loadPromise;
  }

  window.ensureAdminChartJs = ensureAdminChartJs;
})();
