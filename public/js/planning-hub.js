/**
 * planning-hub.js — Thin planning hub (vuxenmeny v2 Sprint 2 + capability links Sprint 6).
 */
(function () {
  'use strict';

  var CONTENT_LINKS = [
    { href: '/library', icon: '📚', title: 'Bibliotek', sub: 'Scheman, aktiviteter och belöningar' },
    { href: '/library#magic-bilder', icon: '📷', title: 'Bildarkiv', sub: 'Egna foton — tandborste, säng, skola' },
  ];

  var PLANNING_LINKS = [
    { href: '/schedule', icon: '📅', title: 'Veckoschema', sub: 'Redigera barnets vecka' },
    { href: '/daily-log', icon: '📝', title: 'Daglig logg', sub: 'Bocka av och backfill' },
    { href: '/calendar', icon: '🗓️', title: 'Kalender', sub: 'Månad och specialdagar' },
    { href: '/assign-schedule', icon: '📋', title: 'Tilldela schema', sub: 'Kopiera mall till barn' },
  ];

  var CAPABILITY_LINKS = {
    reports: { href: '/reports', icon: '📊', title: 'Rapporter', sub: 'Utveckling och delning' },
    samarbete: { href: '/samarbete', icon: '🤝', title: 'Pedagogsamarbete', sub: 'Samarbeta med pedagog' },
    barn_stod: { href: '/barn-stod', icon: '🧩', title: 'Extra stöd', sub: 'Visuellt stöd och TEACCH' },
  };

  function escHtml(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function trackClick(label) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, 'nav_hub_click', { hub: 'planning', label: label });
    }
  }

  function linkHtml(l) {
    return (
      '<a href="' +
      escHtml(l.href) +
      '" class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors min-h-[72px]" data-hub-link="' +
      escHtml(l.title) +
      '">' +
      '<span class="text-2xl" aria-hidden="true">' +
      l.icon +
      '</span>' +
      '<span><span class="font-heading font-bold text-navy block">' +
      escHtml(l.title) +
      '</span>' +
      '<span class="text-sm text-text-soft">' +
      escHtml(l.sub) +
      '</span></span></a>'
    );
  }

  function sectionHtml(label, links) {
    if (!links.length) return '';
    return (
      '<section class="magic-hub-section">' +
      '<h2 class="magic-hub-section-label">' + escHtml(label) + '</h2>' +
      '<div class="magic-hub-links grid gap-3">' + links.map(linkHtml).join('') + '</div>' +
      '</section>'
    );
  }

  async function getSections() {
    var planning = PLANNING_LINKS.slice();
    if (window.NavConfig && window.fetchPackageAccess) {
      try {
        var access = await window.fetchPackageAccess();
        var caps = NavConfig.capabilitiesForPlacement(access, null, 'planning_hub');
        for (var i = 0; i < caps.length; i++) {
          var cap = caps[i];
          var extra = CAPABILITY_LINKS[cap.id];
          if (extra) planning.push(extra);
        }
      } catch (_) {
        /* basic links only */
      }
    }
    return {
      content: CONTENT_LINKS.slice(),
      planning: planning,
    };
  }

  async function render() {
    var mount = document.getElementById('planningHubMount');
    if (!mount) return;

    var sections = await getSections();
    mount.innerHTML =
      '<div class="magic-hub-sections max-w-lg space-y-6">' +
      sectionHtml('Bygg innehåll', sections.content) +
      sectionHtml('Planera vardagen', sections.planning) +
      '</div>';

    mount.querySelectorAll('[data-hub-link]').forEach(function (el) {
      el.addEventListener('click', function () {
        trackClick(el.getAttribute('data-hub-link'));
        try {
          var href = el.getAttribute('href') || '';
          if (href.indexOf('/library') === 0) {
            sessionStorage.setItem('libFromPlanning', '1');
            if (href.indexOf('#magic-') >= 0) {
              sessionStorage.setItem('libDirectSection', '1');
            } else {
              sessionStorage.removeItem('libDirectSection');
            }
          }
        } catch (_) {}
      });
    });
  }

  async function bootPlanningPage() {
    await render();
  }

  window.PlanningHub = { render: render };

  if (window.ParentMagicPageBoot) {
    ParentMagicPageBoot.register('planning', bootPlanningPage);
  }

  window.addEventListener('stjarndag-magic-navigated', function (e) {
    if (e.detail && e.detail.pageId === 'planning') render();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
