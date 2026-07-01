/**
 * planning-hub.js — Planering hub 10/10 (vuxenmeny v2 + vision copy/order).
 * POS: B-08 — build tools live here, not on Hem.
 */
(function () {
  'use strict';

  const CONTENT_LINKS = [
    { href: '/library', icon: '📚', title: 'Bibliotek', sub: 'Skapa aktiviteter och belöningar' },
    { href: '/library#magic-bilder', icon: '📷', title: 'Bildarkiv', sub: 'Egna foton — tandborste, säng, skola' },
  ];

  const PLAN_LINKS = [
    { href: '/schedule', icon: '📅', title: 'Veckoschema', sub: 'Redigera barnets vecka' },
    { href: '/calendar', icon: '🗓️', title: 'Kalender', sub: 'Se månad och specialdagar' },
  ];

  const CUSTODY_LINK = {
    href: '/family#custodyScheduleSection',
    icon: '🏠',
    title: 'Boendeschema',
    sub: 'Växelvis boende mellan hushåll',
  };

  const OTHER_LINKS = [
    { href: '/daily-log', icon: '📝', title: 'Daglig logg', sub: 'Se och justera tidigare dagar' },
    { href: '/print-schema', icon: '📄', title: 'Skapa PDF — schema', sub: 'Skriv ut schema' },
    { href: '/assign-schedule', icon: '📋', title: 'Tilldela schema', sub: 'Kopiera schema till barn' },
  ];

  const CAPABILITY_LINKS = {
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
      '" data-full-load="1">' +
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

  function gettingStartedHtml() {
    return (
      '<section class="magic-hub-section mb-1" data-planning-getting-started="1">' +
      '<div class="p-3 bg-white rounded-2xl border border-gold/40">' +
      '<p class="font-heading font-bold text-navy text-sm mb-1">Kom igång</p>' +
      '<p class="text-sm text-text-soft leading-snug">' +
      'Börja i <a href="/library" class="text-gold font-semibold underline" data-hub-link="Kom igång Bibliotek" data-full-load="1">Biblioteket</a> om du vill skapa aktiviteter. ' +
      'Gå till <a href="/for-dig" class="text-gold font-semibold underline" data-hub-link="Kom igång För dig" data-full-load="1">För dig</a> om du vill få en färdig rekommendation.' +
      '</p></div></section>'
    );
  }

  async function fetchCustodyActive() {
    if (!window.apiFetch) return false;
    try {
      const res = await window.apiFetch('/api/family/custody');
      if (!res.ok) return false;
      const data = await res.json();
      const homes = data.homes || [];
      const patterns = data.patterns || [];
      return homes.length > 1 || patterns.length > 0;
    } catch (_) {
      return false;
    }
  }

  async function fetchNeedsGettingStarted() {
    if (!window.apiFetch) return false;
    try {
      const res = await window.apiFetch('/api/family/dashboard-stats');
      if (!res.ok) return false;
      const data = await res.json();
      const children = data.children || [];
      if (!children.length) return true;
      return children.every(function (c) {
        const today = c.today || {};
        return (today.total || 0) === 0;
      });
    } catch (_) {
      return false;
    }
  }

  async function getCapabilityLinks() {
    const links = [];
    if (!window.NavConfig || !window.fetchPackageAccess) return links;
    try {
      const access = await window.fetchPackageAccess();
      const caps = NavConfig.capabilitiesForPlacement(access, null, 'planning_hub');
      for (let i = 0; i < caps.length; i++) {
        const extra = CAPABILITY_LINKS[caps[i].id];
        if (extra) links.push(extra);
      }
    } catch (_) {
      /* basic links only */
    }
    return links;
  }

  async function getSections() {
    const custodyActive = await fetchCustodyActive();
    const planLinks = PLAN_LINKS.slice();
    if (custodyActive) planLinks.push(CUSTODY_LINK);

    const other = OTHER_LINKS.slice();
    const capabilities = await getCapabilityLinks();
    for (let i = 0; i < capabilities.length; i++) other.push(capabilities[i]);

    return {
      showGettingStarted: await fetchNeedsGettingStarted(),
      content: CONTENT_LINKS.slice(),
      plan: planLinks,
      other: other,
    };
  }

  function bindHubClicks(mount) {
    mount.querySelectorAll('[data-hub-link]').forEach(function (el) {
      el.addEventListener('click', function () {
        trackClick(el.getAttribute('data-hub-link'));
        try {
          const href = el.getAttribute('href') || '';
          if (window.PlanningBackNav) PlanningBackNav.markFromPlanning();
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

  async function render() {
    const mount = document.getElementById('planningHubMount');
    if (!mount) return;

    const sections = await getSections();
    let html = '<div class="magic-hub-sections max-w-lg space-y-5">';
    if (sections.showGettingStarted) html += gettingStartedHtml();
    html += sectionHtml('Planera vardagen', sections.plan);
    html += sectionHtml('Bygg innehåll', sections.content);
    if (sections.other.length) html += sectionHtml('Övrigt', sections.other);
    html += '</div>';
    mount.innerHTML = html;
    bindHubClicks(mount);
  }

  async function bootPlanningPage() {
    await render();
  }

  window.PlanningHub = {
    render: render,
    getSections: getSections,
    fetchCustodyActive: fetchCustodyActive,
    fetchNeedsGettingStarted: fetchNeedsGettingStarted,
  };

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
