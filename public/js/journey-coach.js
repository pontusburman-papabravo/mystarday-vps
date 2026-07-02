/**
 * journey-coach.js — Hem coach card from Journey Context only (Fas 3).
 */
(function () {
  'use strict';

  const MOUNT_ID = 'journeyCoachMount';

  /** Inline tips for "Visa tips" experiences */
  const COACH_TIPS = {
    coach_consistency: [
      'Håll schemat kort och tydligt — barnet bygger vanan steg för steg.',
      'Fira varje avprickad aktivitet, även de små.',
      'Låt barnet logga in själv varje morgon.',
    ],
    coach_evening: [
      'Lägg till 2–3 lugna aktiviteter före läggdags.',
      'Samma ordning varje kväll gör det lättare att somna.',
    ],
  };

  /** Navigate CTAs (Utforska / Fortsätt) */
  const COACH_ROUTES = {
    coach_evening: '/planning',
    coach_expand: '/for-dig',
    sj_introduce_stars: '/rewards',
    sj_day2_try_routine: '/schedule',
  };

  const SJ_EXPERIENCES = new Set([
    'sj_day1_child_preview',
    'sj_day2_try_routine',
    'sj_day3_child_try',
    'sj_celebrate_star',
    'sj_introduce_stars',
    'sj_welcome_child_login',
    'sj_help_get_started',
    'sj_day7_reflection',
  ]);

  function lookupExperience(registry, expKey, phase) {
    if (expKey && expKey.startsWith('sj_')) {
      return registry?.phases?.BUILDING_ROUTINE?.[expKey]
        || registry?.phases?.FIRST_USE?.[expKey]
        || {};
    }
    return registry?.phases?.[phase]?.[expKey] || {};
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function tipsHtml(expKey) {
    const tips = COACH_TIPS[expKey];
    if (!tips || !tips.length) return '';
    const items = tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    return '<ul class="journey-coach-tips hidden mt-3 text-sm text-navy space-y-2 list-disc list-inside bg-white/60 rounded-xl p-3">' + items + '</ul>';
  }

  function trackCta(expKey) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, 'journey_coach_cta_click', { experience: expKey });
    }
  }

  function toggleTips(card, btn) {
    const panel = card.querySelector('.journey-coach-tips');
    if (!panel) return;
    const open = panel.classList.toggle('hidden');
    if (btn) {
      btn.textContent = open ? (btn.getAttribute('data-cta-default') || 'Visa tips') : 'Stäng';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    }
  }

  function onCoachCta(expKey, card, btn) {
    trackCta(expKey);

    if (expKey === 'handoff_to_child' && window.DashboardChildHandoff) {
      DashboardChildHandoff.startChildLogin();
      return;
    }

    if (
      expKey === 'sj_day1_child_preview'
      || expKey === 'sj_day3_child_try'
      || expKey === 'sj_help_get_started'
    ) {
      if (window.DashboardChildHandoff && DashboardChildHandoff.startChildLogin) {
        DashboardChildHandoff.startChildLogin();
      } else {
        window.location.href = '/child-login';
      }
      return;
    }

    if (expKey === 'sj_celebrate_star' || expKey === 'sj_welcome_child_login') {
      if (window.JourneyCelebration && JourneyCelebration.dismissCelebration) {
        JourneyCelebration.dismissCelebration();
      }
      return;
    }

    if (expKey === 'sj_day7_reflection') {
      const card = document.querySelector('.journey-coach-card');
      if (card) card.closest('#' + MOUNT_ID).classList.add('hidden');
      return;
    }

    if (COACH_TIPS[expKey]) {
      toggleTips(card, btn);
      return;
    }

    const route = COACH_ROUTES[expKey];
    if (route) {
      window.location.href = route;
      return;
    }

    if (expKey === 'celebrate_first_success' && window.JourneyCelebration) {
      JourneyCelebration.dismissCelebration();
    }
  }

  function bindCta(card, expKey, exp) {
    const btn = card.querySelector('.journey-coach-cta');
    if (!btn) return;
    if (exp.cta) btn.setAttribute('data-cta-default', exp.cta);
    btn.addEventListener('click', function () { onCoachCta(expKey, card, btn); });
  }

  function shouldDeferToExceptions() {
    return window.EngineClient &&
      typeof EngineClient.isReadinessBlockingCoach === 'function' &&
      EngineClient.isReadinessBlockingCoach();
  }

  async function renderCoach(context, registry) {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    if (shouldDeferToExceptions()) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return;
    }

    const expKey = context?.recommended_experiences?.[0];
    const isSj = expKey && SJ_EXPERIENCES.has(expKey);
    const allowedPriority = isSj
      ? ['coach', 'celebration', 'reflection'].includes(context.priority)
      : context.priority === 'coach';

    if (!expKey || !allowedPriority) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return;
    }

    if (expKey.startsWith('fw_')) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return;
    }

    const exp = lookupExperience(registry, expKey, context.phase);
    const isCelebration = context.priority === 'celebration' || exp.tone === 'celebration';
    const isReflection = expKey === 'sj_day7_reflection' || context.priority === 'reflection';

    mount.classList.remove('hidden');

    if (isReflection) {
      const story = context.signup_journey?.reflection_story || exp.body || '';
      mount.innerHTML =
        '<div class="journey-coach-card rounded-2xl border-2 border-gold/40 bg-gold-light p-4 mb-4" role="region" aria-label="Veckoreflektion">' +
        '<p class="text-xs font-bold uppercase tracking-wide text-gold-dark mb-1">En vecka</p>' +
        '<p class="font-heading font-bold text-navy text-base mb-2">' + esc(exp.headline || 'En vecka tillsammans') + '</p>' +
        '<p class="text-sm text-navy whitespace-pre-line mb-3">' + esc(story) + '</p>' +
        (exp.cta ? '<button type="button" class="journey-coach-cta w-full py-3 rounded-xl bg-gold text-white font-semibold text-sm">' + esc(exp.cta) + '</button>' : '') +
        '</div>';
      bindCta(mount.querySelector('.journey-coach-card'), expKey, exp);
      return;
    }

    const borderClass = isCelebration ? 'border-gold bg-gold-light' : 'border-indigo-200 bg-indigo-50';
    const labelClass = isCelebration ? 'text-gold-dark' : 'text-indigo-700';
    const label = isCelebration ? 'Milstolpe' : 'Nästa steg';

    mount.innerHTML =
      '<div class="journey-coach-card rounded-2xl border-2 ' + borderClass + ' p-4 mb-4" role="region" aria-label="' + esc(label) + '">' +
      '<p class="text-xs font-bold uppercase tracking-wide ' + labelClass + ' mb-1">' + esc(label) + '</p>' +
      '<p class="font-heading font-bold text-navy text-base mb-1">' + esc(exp.headline || '') + '</p>' +
      '<p class="text-sm text-text-soft mb-3">' + esc(exp.body || '') + '</p>' +
      tipsHtml(expKey) +
      (exp.cta ? '<button type="button" class="journey-coach-cta w-full py-3 rounded-xl bg-gold text-white font-semibold text-sm">' + esc(exp.cta) + '</button>' : '') +
      '</div>';

    bindCta(mount.querySelector('.journey-coach-card'), expKey, exp);
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

  window.JourneyCoach = { pollCoach, renderCoach, onCoachCta, COACH_TIPS, COACH_ROUTES };
})();
