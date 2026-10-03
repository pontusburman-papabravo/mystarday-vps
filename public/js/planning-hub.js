/**
 * planning-hub.js — Planering has three primary choices: Veckan, Aktiviteter, Mer.
 * POS: 00A one next step, 06A mobile portrait, 04 parent plans the week, 15 calm craft.
 * Calendar is a view of /schedule, not a peer card. Daily log is not a planning tool.
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

  /** Exactly three primary choices. Mer opens a sheet; it is not a fourth destination. */
  const PRIMARY_CHOICES = [
    link('planning.primary.week.title', 'planning.primary.week.sub', '/schedule', 'schema'),
    link('planning.primary.activities.title', 'planning.primary.activities.sub', '/library', 'aktiviteter'),
  ];

  const MER_LINKS = [
    link('planning.links.printSchema.title', 'planning.links.printSchema.sub', '/print-schema', 'rapport'),
    link('planning.links.assignSchedule.title', 'planning.links.assignSchedule.sub', '/assign-schedule', 'kopiera-aktivitet'),
    link('planning.links.templates.title', 'planning.links.templates.sub', '/library#magic-mine', 'schema'),
    link('planning.links.imageArchive.title', 'planning.links.imageArchive.sub', '/library#magic-bilder', 'redigera'),
  ];

  const CUSTODY_LINK = link(
    'planning.links.custody.title',
    'planning.links.custody.sub',
    '/family#custodyScheduleSection',
    'familj'
  );

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
    return '<span class="text-2xl" aria-hidden="true">' + escHtml(l.icon) + '</span>';
  }

  function linkHtml(l) {
    const item = resolveLink(l);
    return (
      '<a href="' +
      escHtml(item.href) +
      '" class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors min-h-[72px]" data-hub-link="' +
      escHtml(item.title) +
      '" data-planning-more-link="' +
      escHtml(item.href) +
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

  function primaryCardHtml(l, role) {
    const item = resolveLink(l);
    return (
      '<a href="' +
      escHtml(item.href) +
      '" class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors min-h-[72px]" data-planning-primary="' +
      role +
      '" data-hub-link="' +
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

  function moreButtonHtml() {
    const title = pt('planning.primary.more.title');
    const sub = pt('planning.primary.more.sub');
    return (
      '<button type="button" class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors min-h-[72px] w-full text-left" data-planning-primary="more" data-planning-more-open="1" data-hub-link="' +
      escHtml(title) +
      '">' +
      hubIcon({ icon: 'support' }) +
      '<span><span class="font-heading font-bold text-navy block">' +
      escHtml(title) +
      '</span>' +
      '<span class="text-sm text-text-soft">' +
      escHtml(sub) +
      '</span></span></button>'
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

  function sheetEl() {
    return document.getElementById('planningMoreSheet');
  }

  function closeMore() {
    const el = sheetEl();
    if (el) el.classList.add('hidden');
  }

  function ensureMoreSheet() {
    let el = sheetEl();
    if (el) return el;
    el = document.createElement('div');
    el.id = 'planningMoreSheet';
    el.className = 'planning-more-sheet hidden fixed inset-0 flex items-end justify-center p-4 bg-black/50';
    el.setAttribute('data-overlay', 'modal');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'planningMoreSheetTitle');
    el.innerHTML =
      '<div class="schedule-menu-surface planning-more-sheet-panel w-full max-w-md rounded-2xl shadow-xl p-4" id="planningMoreSheetPanel">' +
      '<div class="flex items-center justify-between gap-3 mb-3">' +
      '<h3 id="planningMoreSheetTitle" class="text-lg font-heading font-bold text-navy"></h3>' +
      '<button type="button" class="min-h-[44px] min-w-[44px] text-text-soft" data-planning-more-close="1" aria-label="' +
      escHtml(pt('planning.more.close')) +
      '">✕</button></div>' +
      '<div class="flex flex-col gap-2" id="planningMoreSheetLinks"></div></div>';
    el.addEventListener('mousedown', function (ev) {
      if (ev.target === el) closeMore();
    });
    document.body.appendChild(el);
    return el;
  }

  function paintMoreLinks(links) {
    const host = document.getElementById('planningMoreSheetLinks');
    const title = document.getElementById('planningMoreSheetTitle');
    if (title) title.textContent = pt('planning.more.title');
    if (!host) return;
    host.innerHTML = links.map(linkHtml).join('');
    bindHubClicks(host);
  }

  function openMore(links) {
    const el = ensureMoreSheet();
    paintMoreLinks(links);
    el.classList.remove('hidden');
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
    const more = MER_LINKS.slice();
    const custodyActive = await fetchCustodyActive();
    if (custodyActive) more.push(CUSTODY_LINK);
    const capabilities = await getCapabilityLinks();
    for (let i = 0; i < capabilities.length; i++) more.push(capabilities[i]);
    return {
      showGettingStarted: await fetchNeedsGettingStarted(),
      primary: PRIMARY_CHOICES.slice(),
      more: more,
    };
  }

  function bindHubClicks(mount) {
    mount.querySelectorAll('[data-hub-link]').forEach(function (el) {
      if (el.getAttribute('data-planning-bound') === '1') return;
      el.setAttribute('data-planning-bound', '1');
      el.addEventListener('click', function () {
        trackClick(el.getAttribute('data-hub-link'));
        try {
          const href = el.getAttribute('href') || '';
          if (window.PlanningBackNav && href) PlanningBackNav.markFromPlanning();
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
    mount._planningMoreLinks = sections.more;
    let html = '<div class="magic-hub-sections max-w-lg space-y-5">';
    if (sections.showGettingStarted) html += gettingStartedHtml();
    html += '<div class="magic-hub-links grid gap-3" data-planning-primary-set="1">';
    html += primaryCardHtml(PRIMARY_CHOICES[0], 'week');
    html += primaryCardHtml(PRIMARY_CHOICES[1], 'activities');
    html += moreButtonHtml();
    html += '</div></div>';
    mount.innerHTML = html;
    bindHubClicks(mount);
  }

  document.addEventListener('click', function (ev) {
    const openBtn = ev.target.closest('[data-planning-more-open]');
    if (openBtn) {
      const mount = document.getElementById('planningHubMount');
      const links = (mount && mount._planningMoreLinks) || MER_LINKS.slice();
      openMore(links);
      return;
    }
    if (ev.target.closest('[data-planning-more-close]')) closeMore();
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    const el = sheetEl();
    if (el && !el.classList.contains('hidden')) closeMore();
  });

  async function bootPlanningPage() {
    await render();
  }

  window.PlanningHub = {
    render: render,
    getSections: getSections,
    fetchCustodyActive: fetchCustodyActive,
    fetchNeedsGettingStarted: fetchNeedsGettingStarted,
    openMore: openMore,
    closeMore: closeMore,
    PRIMARY_CHOICES: PRIMARY_CHOICES,
    MER_LINKS: MER_LINKS,
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
