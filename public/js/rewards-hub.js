/**
 * rewards-hub.js — Thin rewards hub (vuxenmeny v2 Sprint 2 + capability links Sprint 6).
 */
(function () {
  'use strict';

  function trackClick(label) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, 'nav_hub_click', { hub: 'rewards', label: label });
    }
  }

  function baseHtml() {
    return (
      '<div class="magic-hub-links grid gap-3 max-w-lg">' +
      '<a href="/library#rewards" class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors min-h-[72px]" data-hub-link="Hantera belöningar">' +
      '<span class="text-2xl">🎁</span><span><span class="font-heading font-bold text-navy block">Hantera belöningar</span>' +
      '<span class="text-sm text-text-soft">Skapa och redigera i biblioteket</span></span></a>' +
      '<a href="/skattkammaren" class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors min-h-[72px]" data-hub-link="Föräldervy">' +
      '<span class="text-2xl">⭐</span><span><span class="font-heading font-bold text-navy block">Stjärnor &amp; kista</span>' +
      '<span class="text-sm text-text-soft">Överblick per barn</span></span></a>'
    );
  }

  async function capabilityHtml() {
    if (!window.NavConfig || !window.fetchPackageAccess) return '';
    try {
      const access = await window.fetchPackageAccess();
      const caps = NavConfig.capabilitiesForPlacement(access, null, 'rewards_hub');
      const reports = caps.find(function (c) {
        return c.id === 'reports';
      });
      if (!reports) return '';
      return (
        '<a href="/reports" class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors min-h-[72px]" data-hub-link="Rapporter">' +
        '<span class="text-2xl">📊</span><span><span class="font-heading font-bold text-navy block">Rapporter</span>' +
        '<span class="text-sm text-text-soft">Utveckling och delning</span></span></a>'
      );
    } catch (_) {
      return '';
    }
  }

  async function render() {
    const mount = document.getElementById('rewardsHubMount');
    if (!mount) return;

    const pendingMount = document.getElementById('rewardsPendingMount');
    if (pendingMount && window.PendingApprovals) {
      await PendingApprovals.mountHub(pendingMount);
    }

    const extra = await capabilityHtml();
    mount.innerHTML =
      baseHtml() +
      extra +
      '<p class="text-sm text-text-soft px-1">Utveckling över tid finns under <a href="/family" class="text-gold font-semibold underline">Familj → barnprofil → Framsteg</a>.</p>' +
      '</div>';

    mount.querySelectorAll('[data-hub-link]').forEach(function (el) {
      el.addEventListener('click', function () {
        trackClick(el.getAttribute('data-hub-link'));
      });
    });
  }

  async function bootRewardsPage() {
    await render();
  }

  window.RewardsHub = { render: render };

  if (window.ParentMagicPageBoot) {
    ParentMagicPageBoot.register('rewards', bootRewardsPage);
  }

  window.addEventListener('stjarndag-magic-navigated', function (e) {
    if (e.detail && e.detail.pageId === 'rewards') render();
  });

  document.addEventListener('pending-approvals-changed', function () {
    const pendingMount = document.getElementById('rewardsPendingMount');
    if (pendingMount && window.PendingApprovals) {
      PendingApprovals.mountHub(pendingMount);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
