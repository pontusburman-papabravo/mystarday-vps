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
  };

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
      '<div class="journey-coach-card rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 mb-4" role="region" aria-label="Nästa steg">' +
      '<p class="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-1">Nästa steg</p>' +
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
