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

  const CORE_FEATURES = [
    'veckoschema', 'daglogg', 'beloningssystem', 'aktivitetsbibliotek',
    'specialdagar', 'kalender', 'familjeinbjudan', 'onboarding',
    'manuella_stjarnor', 'barninloggning', 'streak', 'admin_analytics',
    'push_notiser',
  ];

  const GATED_PATHS = {
    '/reports':      'klinisk_rapportering',
    '/pedagog-note': 'pedagoganteckningar',
    '/for-dig':      'for_dig',
  };

  function isCoreSlug(slug) {
    for (let i = 0; i < CORE_FEATURES.length; i++) {
      if (CORE_FEATURES[i] === slug) return true;
    }
    return false;
  }

  // Synchronously hide all [data-feature] elements on the page.
  // Runs before mobile-nav.js or any other script can show the sidebar.
  function hasReportingPackage(access) {
    return !!(access && access.components && access.components.reporting && access.components.reporting.has);
  }

  function hideReportingComponentElements() {
    const els = document.querySelectorAll('[data-component="reporting"]');
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      el._origReportingDisplay = el.style.display;
      el.style.display = 'none';
    }
  }

  function applyReportingComponentGate(packageAccess) {
    const allowed = hasReportingPackage(packageAccess);
    const els = document.querySelectorAll('[data-component="reporting"]');
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (!allowed) {
        if (el.id === 'activeSharingBanner') {
          el.remove();
        } else {
          el.style.display = 'none';
        }
      } else if (el._origReportingDisplay !== undefined) {
        el.style.display = el._origReportingDisplay;
      } else {
        el.style.display = '';
      }
    }
  }

  function hideAllGatedElements() {
    // First: mark sidebar links that don't yet have data-feature with their slug
    // so they can be hidden alongside explicitly-marked elements.
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      const links = sidebar.querySelectorAll('a');
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const href = link.getAttribute('href') || '';
        const cleanPath = href.replace(/\/$/, '') || '/';
        if (GATED_PATHS[cleanPath] && !link.hasAttribute('data-feature')) {
          link.setAttribute('data-feature', GATED_PATHS[cleanPath]);
        }
      }
    }

    // Hide all [data-feature] elements that aren't core features
    const els = document.querySelectorAll('[data-feature]');
    for (let j = 0; j < els.length; j++) {
      const el = els[j];
      const tagName = (el.tagName || '').toLowerCase();
      if (tagName === 'html' || tagName === 'body') continue;
      const slug = el.getAttribute('data-feature');
      if (!slug || isCoreSlug(slug)) continue;
      el._origDisplay = el.style.display;
      el.style.display = 'none';
    }
  }

  // Run synchronously before any other script can read the sidebar
  hideAllGatedElements();
  hideReportingComponentElements();

  function applyFeatureGate(accessible) {
    const els = document.querySelectorAll('[data-feature]');
    for (let j = 0; j < els.length; j++) {
      const el = els[j];
      const tagName = (el.tagName || '').toLowerCase();
      if (tagName === 'html' || tagName === 'body') continue;
      const slug = el.getAttribute('data-feature');
      if (!slug || isCoreSlug(slug)) {
        el.style.display = el._origDisplay !== undefined ? el._origDisplay : '';
      } else if (accessible[slug]) {
        el.style.display = el._origDisplay !== undefined ? el._origDisplay : '';
      } else {
        el.style.display = 'none';
      }
    }

    // Remove #activeSharingBanner if klinisk_rapportering is not accessible
    const banner = document.getElementById('activeSharingBanner');
    if (banner && !accessible['klinisk_rapportering']) {
      banner.remove();
    }
    if (window._packageAccess) {
      applyReportingComponentGate(window._packageAccess);
    }
  }

  // MutationObserver: re-apply gate to newly inserted [data-feature] elements
  function observeNewElements() {
    if (document.documentElement.classList.contains('is-native-android')) return;
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(function () {
      if (window._stjarndagFeatures) {
        applyFeatureGate(window._stjarndagFeatures);
      }
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  const loadFeatures = window.fetchStjarndagFeatures
    ? window.fetchStjarndagFeatures()
    : fetch('/api/features', { credentials: 'include' }).then(function (r) { return r.ok ? r.json() : []; });

  const loadPackageAccess = window.fetchPackageAccess
    ? window.fetchPackageAccess().catch(function () { return null; })
    : fetch('/api/subscription/access', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });

  Promise.all([loadFeatures, loadPackageAccess])
    .then(function (results) {
      const features = results[0];
      const packageAccess = results[1];
      if (packageAccess) {
        window._packageAccess = packageAccess;
        applyReportingComponentGate(packageAccess);
      }
      const accessible = {};
      for (let i = 0; i < features.length; i++) {
        accessible[features[i].slug] = true;
      }
      window._stjarndagFeatures = accessible;
      applyFeatureGate(accessible);
      observeNewElements();
      window.dispatchEvent(new CustomEvent('stjarndag-features-loaded'));
    })
    .catch(function () {
      // fail-closed: leave elements hidden on network/server error
    });
})();