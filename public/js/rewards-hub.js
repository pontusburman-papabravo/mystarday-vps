/**
 * rewards-hub.js — Belöningar hub 10/10 (vuxenmeny v2 + vision priority ladder).
 * POS: R-02, G-01, PA-06 — godkännanden → hantera → följa.
 */
(function () {
  'use strict';

  const MANAGE_LINK = {
    href: '/library#rewards',
    icon: '🎁',
    title: 'Hantera belöningar',
    sub: 'Skapa och redigera i biblioteket',
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
      analytics.track(null, 'nav_hub_click', { hub: 'rewards', label: label });
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

  function sectionHtml(label, innerHtml) {
    return (
      '<section class="magic-hub-section">' +
      '<h2 class="magic-hub-section-label">' + escHtml(label) + '</h2>' +
      innerHtml +
      '</section>'
    );
  }

  /**
   * Närhet till nästa belöning — per barn, ingen syskonjämförelse.
   * @param {{ star_balance?: number, nearest_reward?: { name?: string, icon?: string, star_cost?: number } }} child
   */
  function proximityCopy(child) {
    const stars = child.star_balance || 0;
    const nearest = child.nearest_reward;
    if (!nearest || !nearest.star_cost) {
      return stars + ' ⭐';
    }
    const gap = nearest.star_cost - stars;
    const rewardLabel = (nearest.icon || '🎁') + ' ' + (nearest.name || 'belöning');
    if (gap <= 0) {
      return stars + ' ⭐ · Redo för ' + rewardLabel;
    }
    const gapLabel = gap === 1 ? '1 ⭐' : gap + ' ⭐';
    return stars + ' ⭐ · ' + gapLabel + ' kvar till ' + rewardLabel;
  }

  function childRowHtml(child) {
    const href = '/family/child/' + encodeURIComponent(child.id) + '?tab=rewards';
    const emoji = child.emoji || '⭐';
    return (
      '<a href="' + escHtml(href) + '" class="rewards-child-row flex items-center gap-3 p-3 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors min-h-[56px] no-underline" data-hub-link="' +
      escHtml(child.name || 'Barn') + ' stjärnor">' +
      '<span class="text-2xl flex-shrink-0" aria-hidden="true">' + escHtml(emoji) + '</span>' +
      '<span class="flex-1 min-w-0">' +
      '<span class="font-heading font-bold text-navy block truncate">' + escHtml(child.name || 'Barn') + '</span>' +
      '<span class="text-sm text-text-soft leading-snug">' + escHtml(proximityCopy(child)) + '</span>' +
      '</span>' +
      '<span class="text-text-soft flex-shrink-0" aria-hidden="true">→</span></a>'
    );
  }

  function starsSectionInner(children) {
    if (!children.length) {
      return (
        '<p class="text-sm text-text-soft px-1 leading-snug">' +
        'Lägg till barn under <a href="/family" class="text-gold font-semibold underline" data-hub-link="Familj">Familj</a> för att se stjärnor här.' +
        '</p>'
      );
    }
    return '<div class="magic-hub-links grid gap-2">' + children.map(childRowHtml).join('') + '</div>';
  }

  async function fetchChildStars() {
    if (!window.apiFetch) return [];
    try {
      const res = await window.apiFetch('/api/family/dashboard-stats');
      if (!res.ok) return [];
      const data = await res.json();
      return data.children || [];
    } catch (_) {
      return [];
    }
  }

  async function reportsLinkHtml() {
    if (!window.NavConfig || !window.fetchPackageAccess) return '';
    try {
      const access = await window.fetchPackageAccess();
      const caps = NavConfig.capabilitiesForPlacement(access, null, 'rewards_hub');
      const reports = caps.find(function (c) {
        return c.id === 'reports';
      });
      if (!reports) return '';
      return linkHtml({
        href: '/reports',
        icon: '📊',
        title: 'Rapporter',
        sub: 'Utveckling och delning',
      });
    } catch (_) {
      return '';
    }
  }

  function bindHubClicks(mount) {
    mount.querySelectorAll('[data-hub-link]').forEach(function (el) {
      el.addEventListener('click', function () {
        trackClick(el.getAttribute('data-hub-link'));
      });
    });
  }

  async function renderPending() {
    const pendingMount = document.getElementById('rewardsPendingMount');
    if (!pendingMount || !window.PendingApprovals) return;
    await PendingApprovals.mountHub(pendingMount, { hub: true });
  }

  async function render() {
    const mount = document.getElementById('rewardsHubMount');
    if (!mount) return;

    await renderPending();

    const children = await fetchChildStars();
    const reports = await reportsLinkHtml();

    let html = '<div class="magic-hub-sections max-w-lg space-y-5">';
    html += sectionHtml('Hantera', '<div class="magic-hub-links grid gap-3">' + linkHtml(MANAGE_LINK) + '</div>');
    html +=
      sectionHtml(
        'Stjärnor & kista',
        '<p class="text-sm text-text-soft mb-2 px-0.5">Överblick per barn</p>' + starsSectionInner(children)
      );
    if (reports) {
      html += sectionHtml('Övrigt', '<div class="magic-hub-links grid gap-3">' + reports + '</div>');
    }
    html +=
      '<p class="text-sm text-text-soft px-1 leading-snug">Utveckling över tid finns under ' +
      '<a href="/family" class="text-gold font-semibold underline" data-hub-link="Familj Framsteg">Familj → barnprofil → Framsteg</a>.</p>';
    html += '</div>';

    mount.innerHTML = html;
    bindHubClicks(mount);
  }

  async function bootRewardsPage() {
    await render();
  }

  window.RewardsHub = {
    render: render,
    fetchChildStars: fetchChildStars,
    proximityCopy: proximityCopy,
  };

  if (window.ParentMagicPageBoot) {
    ParentMagicPageBoot.register('rewards', bootRewardsPage);
  }

  window.addEventListener('stjarndag-magic-navigated', function (e) {
    if (e.detail && e.detail.pageId === 'rewards') render();
  });

  document.addEventListener('pending-approvals-changed', function () {
    void render();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
