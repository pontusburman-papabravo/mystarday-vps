/**
 * Lazy-load admin section scripts on first navigation (keeps /admin cold load small).
 */
(function () {
  'use strict';

  const SCRIPT_PACKS = {
    overview: [],
    families: [
      '/admin/admin-families.js?v=2.4.0',
      '/admin/admin-family-hub.js?v=1.1.0',
      '/admin/admin-database-export.js?v=1.0.0',
    ],
    arenden: [
      '/admin/admin-arenden-charts.js?v=1.0.0',
      '/admin/admin-messages-inbox.js?v=1.6.0',
    ],
    prenumeration: [
      '/admin/admin-prenumeration-shell.js?v=1.0.0',
      '/admin/admin-subscription-settings.js?v=1.0.2',
    ],
    paket: [
      '/admin/admin-paket-shell.js?v=1.0.0',
      '/admin/admin-paket-workspace.js?v=1.0.0',
    ],
    defaults: ['/admin/admin-library.js?v=2.1.1'],
    retention: ['/admin/admin-retention.js?v=1.0.0'],
    foraldaraktivering: ['/admin/admin-activation-program.js?v=1.0.0'],
    growthStuck: ['/admin/admin-growth-stuck.js?v=1.0.0'],
    l1Governance: ['/admin/admin-l1-governance.js?v=1.1.0'],
    fordig: ['/admin/admin-for-dig.js?v=2.3.0'],
    dagensnyhet: [
      '/admin/admin-dagensnyhet.js?v=2.1.0',
      '/admin/admin-email-stats.js?v=1.0.0',
    ],
    landning: [
      '/admin/admin-landning-shell.js?v=1.0.0',
      '/admin/admin-landing-news.js?v=1.0.0',
    ],
    bildbank: [
      '/admin/admin-landning-shell.js?v=1.0.0',
      '/admin/admin-images.js?v=1.0.0',
    ],
    nyhetsbrev: ['/admin/admin-newsletter.js?v=1.0.0'],
    emailmallar: ['/admin/admin-email-templates.js?v=1.0.0'],
    emaillog: ['/admin/admin-email-log.js?v=2.3.1'],
    analytics: [
      '/admin/admin-produktanalys-shell.js?v=1.0.0',
      '/admin/admin-journey-rollout.js?v=1.0.0',
      '/admin/admin-analytics.js?v=2.3.0',
    ],
    anvandning: [
      '/admin/admin-produktanalys-shell.js?v=1.0.0',
      '/admin/admin-journey-daily-analysis.js?v=1.2.0',
    ],
    anvandarstatistik: [
      '/admin/admin-produktanalys-shell.js?v=1.0.0',
      '/admin/admin-user-stats.js?v=1.0.0',
    ],
    undersokningar: [
      '/admin/admin-surveys.js?v=1.0.0',
      '/admin/admin-survey-rapport.js?v=1.0.0',
    ],
    intresseanmalningar: ['/admin/admin-professional-interests.js?v=1.0.0'],
    waitlist: ['/admin/admin-waitlist.js?v=1.0.0'],
    growthPipeline: ['/admin/admin-growth-pipeline.js?v=1.0.0'],
    password: [],
    __idle: ['/admin/admin-command-palette.js?v=1.1.0'],
  };

  const loadedSrc = new Set();
  const inflight = new Map();

  function loadScript(src) {
    if (loadedSrc.has(src)) return Promise.resolve();
    if (inflight.has(src)) return inflight.get(src);
    const p = new Promise(function (resolve, reject) {
      const el = document.createElement('script');
      el.src = src;
      el.async = false;
      el.onload = function () {
        loadedSrc.add(src);
        inflight.delete(src);
        resolve();
      };
      el.onerror = function () {
        inflight.delete(src);
        reject(new Error('Admin script failed: ' + src));
      };
      document.head.appendChild(el);
    });
    inflight.set(src, p);
    return p;
  }

  async function ensureAdminSectionScripts(sectionName) {
    const pack = SCRIPT_PACKS[sectionName] || [];
    for (let i = 0; i < pack.length; i++) {
      await loadScript(pack[i]);
    }
  }

  window.ensureAdminSectionScripts = ensureAdminSectionScripts;
})();
