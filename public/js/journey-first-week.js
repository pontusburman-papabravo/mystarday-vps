/**
 * journey-first-week.js — First week banner + day 7 warm reflection (Fas: first week).
 * Renders from Journey Context only — no local product logic.
 */
(function () {
  'use strict';

  const MOUNT_ID = 'journeyFirstWeekMount';
  const POLL_MS = 60000;
  const FW_ROUTES = {
    fw_day1_morning: '/child-login',
    fw_day1_evening: '/dashboard',
    fw_day2_quiet: '/child-login',
    fw_day3_new_day: '/dashboard',
    fw_day4_discovery: '/child/world',
  };

  let pollTimer = null;
  let flagOff = false;
  let lastRenderedDay = null;
  let lastRenderedExp = null;

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function hideMount() {
    const mount = document.getElementById(MOUNT_ID);
    if (mount) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
    }
    lastRenderedDay = null;
    lastRenderedExp = null;
  }

  function ensureMount() {
    let el = document.getElementById(MOUNT_ID);
    if (el) return el;
    const anchor = document.getElementById('journeyCoachMount');
    el = document.createElement('div');
    el.id = MOUNT_ID;
    el.className = 'hidden mb-4';
    el.setAttribute('aria-live', 'polite');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(el, anchor.nextSibling);
    } else {
      const main = document.querySelector('main') || document.body;
      main.prepend(el);
    }
    return el;
  }

  function track(event, meta) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, event, meta || {});
    }
  }

  async function dismissDay(day) {
    if (!window.JourneyContextClient) return;
    await JourneyContextClient.postEvent('first_week_dismissed', null, null, { day });
    track('first_week_day_dismissed', { day });
    hideMount();
    if (window.JourneyCoach) JourneyCoach.pollCoach();
  }

  async function completeReflection() {
    if (!window.JourneyContextClient) return;
    await JourneyContextClient.postEvent('week_reflection_completed');
    track('first_week_reflection_completed');
    hideMount();
  }

  function routeForExperience(expKey) {
    if (expKey === 'fw_day4_discovery' && window.ChildWorlds
        && typeof ChildWorlds.treasureCanonicalPath === 'function') {
      return ChildWorlds.treasureCanonicalPath();
    }
    return FW_ROUTES[expKey];
  }

  function bindCard(card, expKey, day) {
    const cta = card.querySelector('.journey-fw-cta');
    const dismiss = card.querySelector('.journey-fw-dismiss');
    if (cta) {
      cta.addEventListener('click', function () {
        track('first_week_cta_click', { experience: expKey, day });
        const route = routeForExperience(expKey);
        if (route) window.location.href = route;
        else dismissDay(day);
      });
    }
    if (dismiss) {
      dismiss.addEventListener('click', function () { dismissDay(day); });
    }
  }

  function renderReflection(mount, story, exp, day) {
    mount.classList.remove('hidden');
    const paragraphs = String(story || '').split('\n\n').filter(Boolean)
      .map(function (p) { return '<p class="text-sm text-navy/80 leading-relaxed mb-2">' + esc(p) + '</p>'; })
      .join('');
    mount.innerHTML =
      '<div class="journey-fw-card rounded-2xl border-2 border-amber-200 bg-amber-50 p-5" role="dialog" aria-label="Veckoreflektion">' +
      '<p class="font-heading font-bold text-navy text-lg mb-3">' + esc(exp.headline || 'En vecka tillsammans') + '</p>' +
      paragraphs +
      '<button type="button" class="journey-fw-cta w-full py-3 mt-3 rounded-xl bg-gold text-white font-semibold text-sm">' +
      esc(exp.cta || 'Stäng') + '</button></div>';
    const card = mount.querySelector('.journey-fw-card');
    const btn = mount.querySelector('.journey-fw-cta');
    if (btn) btn.addEventListener('click', completeReflection);
    bindCard(card, 'fw_week_reflection', day);
    lastRenderedDay = day;
    lastRenderedExp = 'fw_week_reflection';
  }

  function renderCoachCard(mount, context, registry, expKey) {
    const exp = registry?.phases?.[context.phase]?.[expKey] || {};
    const day = context.first_week?.effective_day || context.first_week?.day;
    mount.classList.remove('hidden');
    mount.innerHTML =
      '<div class="journey-fw-card rounded-2xl border-2 border-sky-200 bg-sky-50 p-4" role="region">' +
      '<div class="flex justify-between items-start gap-2 mb-1">' +
      '<button type="button" class="journey-fw-dismiss text-sky-600 text-xs font-medium shrink-0 ml-auto" aria-label="Stäng">✕</button>' +
      '</div>' +
      '<p class="font-heading font-bold text-navy text-base mb-1">' + esc(exp.headline || '') + '</p>' +
      '<p class="text-sm text-navy/80 leading-relaxed mb-3">' + esc(exp.body || '') + '</p>' +
      (exp.cta ? '<button type="button" class="journey-fw-cta w-full py-3 rounded-xl bg-gold text-white font-semibold text-sm">' +
        esc(exp.cta) + '</button>' : '') +
      '</div>';
    bindCard(mount.querySelector('.journey-fw-card'), expKey, day);
    lastRenderedDay = day;
    lastRenderedExp = expKey;
  }

  function shouldRender(context) {
    if (context?.signup_journey?.active) return false;
    if (!context?.capabilities?.first_week_v1) return false;
    if (!context.first_week?.active) return false;
    if (context.celebration || context.blocking_experience === 'parent_ack_completion') return false;
    if (context.first_week.silent || context.priority === 'none') return false;
    const expKey = context.recommended_experiences?.[0];
    if (context.priority === 'reflection' || expKey === 'fw_week_reflection') return true;
    return Boolean(expKey && expKey.startsWith('fw_'));
  }

  async function render(context, registry) {
    if (!shouldRender(context)) {
      hideMount();
      return;
    }

    const mount = ensureMount();
    const expKey = context.recommended_experiences?.[0];
    const fw = context.first_week;
    const day = fw.effective_day || fw.day;

    if (lastRenderedDay === day && lastRenderedExp === expKey && mount.innerHTML) {
      return;
    }

    if (context.priority === 'reflection' || expKey === 'fw_week_reflection') {
      const exp = registry?.phases?.BUILDING_ROUTINE?.fw_week_reflection || {};
      renderReflection(mount, fw.reflection_story, exp, day);
      return;
    }

    if (expKey && expKey.startsWith('fw_')) {
      renderCoachCard(mount, context, registry, expKey);
      return;
    }

    hideMount();
  }

  async function poll() {
    if (flagOff || !window.JourneyContextClient) return;
    const enabled = await JourneyContextClient.isJourneyApiEnabled();
    if (!enabled) return;

    const ctx = await JourneyContextClient.fetchContext(true);
    if (!ctx?.capabilities?.first_week_v1) {
      flagOff = true;
      hideMount();
      if (pollTimer) clearInterval(pollTimer);
      return;
    }

    const registry = await JourneyContextClient.fetchRegistry();
    await render(ctx, registry);
  }

  function init() {
    if (!document.getElementById('journeyCoachMount') && !document.querySelector('main')) return;
    poll();
    pollTimer = setInterval(poll, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.JourneyFirstWeek = { poll, render, dismissDay, completeReflection, shouldRender, hideMount };
})();
