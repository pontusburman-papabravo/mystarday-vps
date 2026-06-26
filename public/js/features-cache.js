/**
 * features-cache.js — single shared promise for GET /api/features.
 * Loaded early (platform-html inject) so feature-check, mobile-nav and
 * outcome-banner do not each fire a separate request.
 */
(function () {
  'use strict';

  window.fetchStjarndagFeatures = function fetchStjarndagFeatures() {
    if (window._stjarndagFeaturesPromise) return window._stjarndagFeaturesPromise;

    window._stjarndagFeaturesPromise = fetch('/api/features', { credentials: 'include' })
      .then(function (res) {
        return res.ok ? res.json() : [];
      })
      .then(function (features) {
        const accessible = {};
        for (let i = 0; i < features.length; i++) {
          accessible[features[i].slug] = true;
        }
        window._stjarndagFeatures = accessible;
        return features;
      })
      .catch(function () {
        return [];
      });

    return window._stjarndagFeaturesPromise;
  };
})();
