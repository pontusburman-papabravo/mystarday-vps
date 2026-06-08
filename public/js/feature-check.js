/**
 * Feature flag frontend gate.
 * Loads accessible features from /api/features and:
 *  1. Hides [data-feature] elements where the family lacks access
 *  2. Removes #activeSharingBanner if klinisk_rapportering is not accessible
 *  3. Hides sidebar links to gated paths (/reports → klinisk_rapportering,
 *     /pedagog-note → pedagoganteckningar)
 * CORE_FEATURES (veckoschema, daglogg, etc.) are never hidden.
 * Fail-closed: OFF features are hidden by default until the API confirms access.
 * Synchronous execution — runs before any other script touches the DOM.
 */

(function () {
  'use strict';

  var CORE_FEATURES = [
    'veckoschema', 'daglogg', 'beloningssystem', 'aktivitetsbibliotek',
    'specialdagar', 'kalender', 'familjeinbjudan', 'onboarding',
    'manuella_stjarnor', 'barninloggning', 'streak', 'admin_analytics',
    'push_notiser',
  ];

  var GATED_PATHS = {
    '/reports':      'klinisk_rapportering',
    '/pedagog-note': 'pedagoganteckningar',
  };

  function isCoreSlug(slug) {
    for (var i = 0; i < CORE_FEATURES.length; i++) {
      if (CORE_FEATURES[i] === slug) return true;
    }
    return false;
  }

  // Synchronously hide all [data-feature] elements on the page.
  // Runs before mobile-nav.js or any other script can show the sidebar.
  function hideAllGatedElements() {
    // First: mark sidebar links that don't yet have data-feature with their slug
    // so they can be hidden alongside explicitly-marked elements.
    var sidebar =
      document.getElementById('sidebar') ||
      document.querySelector('nav.bg-navy');
    if (sidebar) {
      var links = sidebar.querySelectorAll('a');
      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        var href = link.getAttribute('href') || '';
        var cleanPath = href.replace(/\/$/, '') || '/';
        if (GATED_PATHS[cleanPath] && !link.hasAttribute('data-feature')) {
          link.setAttribute('data-feature', GATED_PATHS[cleanPath]);
        }
      }
    }

    // Hide all [data-feature] elements that aren't core features
    var els = document.querySelectorAll('[data-feature]');
    for (var j = 0; j < els.length; j++) {
      var el = els[j];
      var tagName = (el.tagName || '').toLowerCase();
      if (tagName === 'html' || tagName === 'body') continue;
      var slug = el.getAttribute('data-feature');
      if (!slug || isCoreSlug(slug)) continue;
      el._origDisplay = el.style.display;
      el.style.display = 'none';
    }
  }

  // Run synchronously before any other script can read the sidebar
  hideAllGatedElements();

  function applyFeatureGate(accessible) {
    var els = document.querySelectorAll('[data-feature]');
    for (var j = 0; j < els.length; j++) {
      var el = els[j];
      var tagName = (el.tagName || '').toLowerCase();
      if (tagName === 'html' || tagName === 'body') continue;
      var slug = el.getAttribute('data-feature');
      if (!slug || isCoreSlug(slug)) {
        el.style.display = el._origDisplay !== undefined ? el._origDisplay : '';
      } else if (accessible[slug]) {
        el.style.display = el._origDisplay !== undefined ? el._origDisplay : '';
      } else {
        el.style.display = 'none';
      }
    }

    // Remove #activeSharingBanner if klinisk_rapportering is not accessible
    var banner = document.getElementById('activeSharingBanner');
    if (banner && !accessible['klinisk_rapportering']) {
      banner.remove();
    }
  }

  // MutationObserver: re-apply gate to newly inserted [data-feature] elements
  function observeNewElements() {
    if (typeof MutationObserver === 'undefined') return;
    var observer = new MutationObserver(function () {
      if (window._stjarndagFeatures) {
        applyFeatureGate(window._stjarndagFeatures);
      }
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  fetch('/api/features', { credentials: 'include' })
    .then(function (res) {
      if (!res.ok) return [];
      return res.json();
    })
    .then(function (features) {
      var accessible = {};
      for (var i = 0; i < features.length; i++) {
        accessible[features[i].slug] = true;
      }
      window._stjarndagFeatures = accessible;
      applyFeatureGate(accessible);
      observeNewElements();
    })
    .catch(function () {
      // fail-closed: leave elements hidden on network/server error
    });
})();