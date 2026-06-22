/**
 * planning-hub.js — Thin planning hub (vuxenmeny v2 Sprint 2 + capability links Sprint 6).
 */
(function () {
  'use strict';

  var BASE_LINKS = [
    { href: '/schedule', icon: '📅', title: 'Veckoschema', sub: 'Redigera barnets vecka' },
    { href: '/daily-log', icon: '📝', title: 'Daglig logg', sub: 'Bocka av och backfill' },
    { href: '/calendar', icon: '🗓️', title: 'Kalender', sub: 'Månad och specialdagar' },
    { href: '/library', icon: '📚', title: 'Bibliotek', sub: 'Aktiviteter och scheman' },
    { href: '/assign-schedule', icon: '📋', title: 'Tilldela schema', sub: 'Kopiera mall till barn' },
    { href: '/activities', icon: '➕', title: 'Aktiviteter', sub: 'Hantera aktivitetsbibliotek' },
  ];

  var CAPABILITY_LINKS = {
    reports: { href: '/reports', icon: '📊', title: 'Rapporter', sub: 'Utveckling och delning' },
    samarbete: { href: '/samarbete', icon: '🤝', title: 'Pedagogsamarbete', sub: 'Samarbeta med pedagog' },
    barn_stod: { href: '/barn-stod', icon: '🧩', title: 'Extra stöd', sub: 'Visuellt stöd och TEACCH' },
  };

  function trackClick(label) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, 'nav_hub_click', { hub: 'planning', label: label });
    }
  }

  function linkHtml(l) {
    return (
      '<a href="' +
      l.href +
      '" class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors min-h-[72px]" data-hub-link="' +
      l.title +
      '">' +
      '<span class="text-2xl" aria-hidden="true">' +
      l.icon +
      '</span>' +
      '<span><span class="font-heading font-bold text-navy block">' +
      l.title +
      '</span>' +
      '<span class="text-sm text-text-soft">' +
      l.sub +
      '</span></span></a>'
    );
  }

  async function getLinks() {
    var links = BASE_LINKS.slice();
    if (!window.NavConfig || !window.fetchPackageAccess) return links;

    try {
      var access = await window.fetchPackageAccess();
      var caps = NavConfig.capabilitiesForPlacement(access, null, 'planning_hub');
      for (var i = 0; i < caps.length; i++) {
        var cap = caps[i];
        var extra = CAPABILITY_LINKS[cap.id];
        if (extra) links.push(extra);
      }
    } catch (_) {
      /* basic links only */
    }
    return links;
  }

  async function render() {
    var mount = document.getElementById('planningHubMount');
    if (!mount) return;

    var links = await getLinks();
    mount.innerHTML = '<div class="magic-hub-links grid gap-3 max-w-lg">' + links.map(linkHtml).join('') + '</div>';

    mount.querySelectorAll('[data-hub-link]').forEach(function (el) {
      el.addEventListener('click', function () {
        trackClick(el.getAttribute('data-hub-link'));
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
