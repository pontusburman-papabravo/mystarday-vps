/**
 * planning-hub.js — Planering hub 10/10 (vuxenmeny v2 + vision copy/order).
 * POS: B-08 — build tools live here, not on Hem.
 */
(function () {
  'use strict';

  function pt(key, params) {
    return (typeof window.pt === 'function') ? window.pt(key, params) : key;
  }

  function link(titleKey, subKey, href, icon) {
    return {
      href: href,
      icon: icon,
      title: pt(titleKey),
      sub: pt(subKey),
      titleKey: titleKey,
      subKey: subKey,
    };
  }

  function resolveLink(l) {
    return {
      href: l.href,
      icon: l.icon,
      title: l.titleKey ? pt(l.titleKey) : l.title,
      sub: l.subKey ? pt(l.subKey) : l.sub,
    };
  }

  const CONTENT_LINKS = [
    link('planning.links.library.title', 'planning.links.library.sub', '/library', 'aktiviteter'),
    link('planning.links.imageArchive.title', 'planning.links.imageArchive.sub', '/library#magic-bilder', 'redigera'),
  ];

  const PLAN_LINKS = [
    link('planning.links.weekSchedule.title', 'planning.links.weekSchedule.sub', '/schedule', 'schema'),
    link('planning.links.calendar.title', 'planning.links.calendar.sub', '/calendar', 'kalender'),
  ];

  const CUSTODY_LINK = link(
    'planning.links.custody.title',
    'planning.links.custody.sub',
    '/family#custodyScheduleSection',
    'familj'
  );

  const OTHER_LINKS = [
    link('planning.links.dailyLog.title', 'planning.links.dailyLog.sub', '/daily-log', 'historik'),
    link('planning.links.printSchema.title', 'planning.links.printSchema.sub', '/print-schema', 'rapport'),
    link('planning.links.assignSchedule.title', 'planning.links.assignSchedule.sub', '/assign-schedule', 'kopiera-aktivitet'),
  ];

  const CAPABILITY_LINKS = {
    reports: link('planning.links.reports.title', 'planning.links.reports.sub', '/reports', 'rapport'),
    samarbete: link('planning.links.samarbete.title', 'planning.links.samarbete.sub', '/samarbete', 'pedagog'),
    barn_stod: link('planning.links.barnStod.title', 'planning.links.barnStod.sub', '/barn-stod', 'support'),
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

  function hubIcon(l) {
    if (window.IconSystem && IconSystem.has(l.icon)) {
      return IconSystem.hub(l.icon);
    }
    return '<span class="text-2xl" aria-hidden="true">' + l.icon + '</span>';
  }

  function linkHtml(l) {
    const item = resolveLink(l);
    return (
      '<a href="' +
      escHtml(item.href) +
      '" class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors min-h-[72px]" data-hub-link="' +
      escHtml(item.title) +
      '" data-full-load="1">' +
      hubIcon(item) +
      '<span><span class="font-heading font-bold text-navy block">' +
      escHtml(item.title) +
      '</span>' +
      '<span class="text-sm text-text-soft">' +
      escHtml(item.sub) +
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
    const library = escHtml(pt('planning.gettingStarted.libraryLink'));
    const forYou = escHtml(pt('planning.gettingStarted.forYouLink'));
    return (
      '<section class="magic-hub-section mb-1" data-planning-getting-started="1">' +
      '<div class="p-3 bg-white rounded-2xl border border-gold/40">' +
      '<p class="font-heading font-bold text-navy text-sm mb-1">' + escHtml(pt('planning.gettingStarted.title')) + '</p>' +
      '<p class="text-sm text-text-soft leading-snug">' +
      escHtml(pt('planning.gettingStarted.bodyBeforeLibrary')) +
      '<a href="/library" class="text-gold font-semibold underline" data-hub-link="' + library + '" data-full-load="1">' + library + '</a>' +
      escHtml(pt('planning.gettingStarted.bodyMiddle')) +
      '<a href="/for-dig" class="text-gold font-semibold underline" data-hub-link="' + forYou + '" data-full-load="1">' + forYou + '</a>' +
      escHtml(pt('planning.gettingStarted.bodyAfter')) +
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
    html += sectionHtml(pt('planning.sections.planWeek'), sections.plan);
    html += sectionHtml(pt('planning.sections.buildContent'), sections.content);
    if (sections.other.length) html += sectionHtml(pt('planning.sections.other'), sections.other);
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

  document.addEventListener('parent-i18n-ready', render);
  document.addEventListener('locale-changed', render);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
