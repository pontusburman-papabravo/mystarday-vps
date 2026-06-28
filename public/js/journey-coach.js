/**
 * journey-coach.js — Hem coach card from Journey Context only (Fas 3).
 */
(function () {
  'use strict';

  const MOUNT_ID = 'journeyCoachMount';

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  async function renderCoach(context, registry) {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    const expKey = context?.recommended_experiences?.[0];
    if (!expKey || context.priority !== 'coach') {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return;
    }

    const exp = registry?.phases?.[context.phase]?.[expKey] || {};
    mount.classList.remove('hidden');
    mount.innerHTML =
      '<div class="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 mb-4" role="region" aria-label="Nästa steg">' +
      '<p class="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-1">Nästa steg</p>' +
      '<p class="font-heading font-bold text-navy text-base mb-1">' + esc(exp.headline || '') + '</p>' +
      '<p class="text-sm text-text-soft mb-3">' + esc(exp.body || '') + '</p>' +
      (exp.cta ? '<button type="button" class="journey-coach-cta w-full py-3 rounded-xl bg-gold text-white font-semibold text-sm">' + esc(exp.cta) + '</button>' : '') +
      '</div>';

    const btn = mount.querySelector('.journey-coach-cta');
    if (btn && expKey === 'handoff_to_child' && window.DashboardChildHandoff) {
      btn.addEventListener('click', function () { DashboardChildHandoff.startChildLogin(); });
    }
  }

  async function pollCoach() {
    if (!window.JourneyContextClient) return;
    const enabled = await JourneyContextClient.isJourneyApiEnabled();
    if (!enabled) return;

    const ctx = await JourneyContextClient.fetchContext();
    const registry = await JourneyContextClient.fetchRegistry();
    await renderCoach(ctx, registry);
  }

  function init() {
    if (!document.getElementById(MOUNT_ID)) return;
    pollCoach();
    setInterval(pollCoach, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.JourneyCoach = { pollCoach, renderCoach };
})();
