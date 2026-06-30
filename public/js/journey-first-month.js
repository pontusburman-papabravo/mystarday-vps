/**
 * journey-first-month.js — First month moments (dag 8–30). Journey Context only.
 */
(function () {
  'use strict';

  const MOUNT_ID = 'journeyFirstMonthMount';
  const POLL_MS = 60000;
  const FM_ROUTES = {
    fm_own_initiative: '/planning',
    fm_child_explores: '/child-login',
    fm_welcome_back: '/dashboard',
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
    const anchor = document.getElementById('journeyFirstWeekMount')
      || document.getElementById('journeyCoachMount');
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

  async function dismissMoment(momentKey, day) {
    if (!window.JourneyContextClient) return;
    await JourneyContextClient.postEvent('first_month_moment_dismissed', null, null, { moment: momentKey });
    track('first_month_moment_dismissed', { moment: momentKey, day });
    hideMount();
    if (window.JourneyCoach) JourneyCoach.pollCoach();
  }

  async function completeAffirmation() {
    if (!window.JourneyContextClient) return;
    await JourneyContextClient.postEvent('month_reflection_completed');
    track('first_month_reflection_completed');
    hideMount();
  }

  function cardClasses(priority) {
    if (priority === 'reflection') return 'border-stone-300 bg-stone-50';
    if (priority === 'whisper') return 'border-stone-200 bg-stone-50/60';
    if (priority === 'affirmation') return 'border-emerald-200 bg-emerald-50/80';
    return 'border-sky-200 bg-sky-50';
  }

  function bindCard(card, expKey, day, priority) {
    const cta = card.querySelector('.journey-fm-cta');
    const dismiss = card.querySelector('.journey-fm-dismiss');
    if (cta) {
      cta.addEventListener('click', function () {
        track('first_month_cta_click', { experience: expKey, day });
        if (expKey === 'fm_month_affirmation') {
          completeAffirmation();
          return;
        }
        const route = FM_ROUTES[expKey];
        if (route) window.location.href = route;
        else dismissMoment(expKey, day);
      });
    }
    if (dismiss) {
      dismiss.addEventListener('click', function () { dismissMoment(expKey, day); });
    }
  }

  function renderReflection(mount, story, exp, day) {
    mount.classList.remove('hidden');
    const paragraphs = String(story || '').split('\n\n').filter(Boolean)
      .map(function (p) {
        return '<p class="text-sm text-navy/80 leading-relaxed mb-2">' + esc(p) + '</p>';
      }).join('');
    mount.innerHTML =
      '<div class="journey-fm-card rounded-2xl border-2 ' + cardClasses('reflection') + ' p-5" role="dialog" aria-label="Månadsbekräftelse">' +
      '<p class="font-heading font-bold text-navy text-lg mb-3">' + esc(exp.headline || 'Er vardag') + '</p>' +
      paragraphs +
      '<button type="button" class="journey-fm-cta w-full py-3 mt-3 rounded-xl bg-stone-600 text-white font-semibold text-sm">' +
      esc(exp.cta || 'Stäng') + '</button></div>';
    bindCard(mount.querySelector('.journey-fm-card'), 'fm_month_affirmation', day, 'reflection');
    lastRenderedDay = day;
    lastRenderedExp = 'fm_month_affirmation';
  }

  function renderWhisperCard(mount, context, registry, expKey) {
    const exp = registry?.phases?.[context.phase]?.[expKey] || {};
    const fm = context.first_month;
    const day = fm?.effective_day || fm?.day;
    mount.classList.remove('hidden');
    const body = esc(exp.body || '');
    mount.innerHTML =
      '<div class="journey-fm-card journey-fm-whisper rounded-xl border ' + cardClasses('whisper') + ' px-4 py-3" role="status">' +
      '<div class="flex justify-between items-start gap-2">' +
      '<p class="text-sm text-navy/75 leading-relaxed flex-1">' + body + '</p>' +
      '<button type="button" class="journey-fm-dismiss text-navy/30 text-xs font-medium shrink-0" aria-label="Stäng">✕</button>' +
      '</div></div>';
    bindCard(mount.querySelector('.journey-fm-card'), expKey, day, 'whisper');
    lastRenderedDay = day;
    lastRenderedExp = expKey;
  }

  function renderMomentCard(mount, context, registry, expKey, priority) {
    const exp = registry?.phases?.[context.phase]?.[expKey] || {};
    const fm = context.first_month;
    const day = fm?.effective_day || fm?.day;
    mount.classList.remove('hidden');
    mount.innerHTML =
      '<div class="journey-fm-card rounded-2xl border-2 ' + cardClasses(priority) + ' p-4" role="region">' +
      '<div class="flex justify-between items-start gap-2 mb-1">' +
      '<button type="button" class="journey-fm-dismiss text-navy/40 text-xs font-medium shrink-0 ml-auto" aria-label="Stäng">✕</button>' +
      '</div>' +
      '<p class="font-heading font-bold text-navy text-base mb-1">' + esc(exp.headline || '') + '</p>' +
      '<p class="text-sm text-navy/80 leading-relaxed mb-3">' + esc(exp.body || '') + '</p>' +
      (exp.cta ? '<button type="button" class="journey-fm-cta w-full py-3 rounded-xl ' +
        (priority === 'affirmation' ? 'bg-emerald-700' : 'bg-gold') +
        ' text-white font-semibold text-sm">' + esc(exp.cta) + '</button>' : '') +
      '</div>';
    bindCard(mount.querySelector('.journey-fm-card'), expKey, day, priority);
    lastRenderedDay = day;
    lastRenderedExp = expKey;
  }

  function shouldRender(context) {
    if (!context?.capabilities?.first_month_v1) return false;
    if (!context.first_month?.active) return false;
    if (context.celebration || context.blocking_experience === 'parent_ack_completion') return false;
    if (context.first_month.silent || context.priority === 'none') return false;
    const expKey = context.recommended_experiences?.[0];
    if (context.priority === 'reflection' || expKey === 'fm_month_affirmation') return true;
    if (context.priority === 'whisper') {
      return Boolean(expKey && expKey.startsWith('fm_'));
    }
    if (context.priority === 'affirmation' || context.priority === 'coach') {
      return Boolean(expKey && expKey.startsWith('fm_'));
    }
    return false;
  }

  async function render(context, registry) {
    if (!shouldRender(context)) {
      hideMount();
      return;
    }

    const mount = ensureMount();
    const expKey = context.recommended_experiences?.[0];
    const fm = context.first_month;
    const day = fm.effective_day || fm.day;
    const priority = context.priority;

    if (lastRenderedDay === day && lastRenderedExp === expKey && mount.innerHTML) {
      return;
    }

    if (priority === 'reflection' || expKey === 'fm_month_affirmation') {
      const exp = registry?.phases?.BUILDING_ROUTINE?.fm_month_affirmation || {};
      renderReflection(mount, fm.affirmation_story, exp, day);
      return;
    }

    if (priority === 'whisper' && expKey && expKey.startsWith('fm_')) {
      renderWhisperCard(mount, context, registry, expKey);
      return;
    }

    if (expKey && expKey.startsWith('fm_')) {
      renderMomentCard(mount, context, registry, expKey, priority);
      return;
    }

    hideMount();
  }

  async function poll() {
    if (flagOff || !window.JourneyContextClient) return;
    const enabled = await JourneyContextClient.isJourneyApiEnabled();
    if (!enabled) return;

    const ctx = await JourneyContextClient.fetchContext(true);
    if (!ctx?.capabilities?.first_month_v1) {
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

  window.JourneyFirstMonth = { poll, render, dismissMoment, completeAffirmation, shouldRender, hideMount };
})();
