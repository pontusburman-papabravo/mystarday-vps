/**
 * onboarding-first-star.js — ACT-1 first star guide overlay (flag-gated).
 * Loaded after onboarding-activation.js; uses OnboardingActivation shared API.
 */
(function () {
  'use strict';

  function act() {
    return window.OnboardingActivation || null;
  }

  function isGuideEnabled() {
    const oa = act();
    if (!oa || typeof oa.getConfig !== 'function') return false;
    if (window.OnboardingHandoffFilm && typeof OnboardingHandoffFilm.isEnabled === 'function') {
      if (OnboardingHandoffFilm.isEnabled()) return false;
    }
    if (window.OnboardingStarterPlan && typeof OnboardingStarterPlan.isSlimFastPath === 'function') {
      if (OnboardingStarterPlan.isSlimFastPath()) return false;
    } else {
      const cfg = oa.getConfig();
      if (cfg && cfg.flags && cfg.flags.activation_signup_slim_v1) return false;
    }
    const cfg = oa.getConfig();
    return Boolean(cfg && cfg.flags && cfg.flags.activation_first_star_guide_v1);
  }

  function childId() {
    const oa = act();
    return oa && typeof oa.getChildId === 'function' ? oa.getChildId() : null;
  }

  function trackEvent(eventType, metadata) {
    const oa = act();
    if (oa && typeof oa.trackEvent === 'function') {
      oa.trackEvent(eventType, metadata);
    }
  }

  function openChildLogin() {
    const oa = act();
    if (oa && typeof oa.openChildLogin === 'function') {
      oa.openChildLogin();
    } else {
      window.location.href = '/child-login';
    }
  }

  function showFirstStarGuide(onDone) {
    if (!isGuideEnabled()) {
      onDone();
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'firstStarGuideOverlay';
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'firstStarGuideTitle');
    overlay.innerHTML = [
      '<div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">',
      '  <div class="text-center mb-4"><div class="text-4xl mb-2" aria-hidden="true">⭐</div>',
      '  <h2 id="firstStarGuideTitle" class="text-xl font-heading font-bold text-navy mb-2">Ge första stjärnan</h2>',
      '  <p class="text-sm text-text-soft mb-4">Tre snabba steg — sedan är ni igång på riktigt.</p></div>',
      '  <ol class="text-sm text-navy space-y-2 mb-5 list-decimal list-inside">',
      '    <li>Låt barnet logga in med PIN-koden</li>',
      '    <li>Markera en aktivitet som klar i barnvyn</li>',
      '    <li>Fira stjärnan tillsammans!</li>',
      '  </ol>',
      '  <button type="button" id="fsgChildLogin" class="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3 rounded-xl min-h-[44px]">👶 Öppna barninloggning</button>',
      '  <button type="button" id="fsgContinueParent" class="w-full text-sm font-semibold text-text-soft hover:text-navy py-2 mt-2 min-h-[44px]">Fortsätt som förälder</button>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);

    document.getElementById('fsgChildLogin').addEventListener('click', function () {
      trackEvent('child_view_opened', { child_id: childId(), source: 'first_star_guide' });
      overlay.remove();
      openChildLogin();
    });
    document.getElementById('fsgContinueParent').addEventListener('click', function () {
      overlay.remove();
      onDone();
    });
  }

  function patchSkipInvite() {
    if (!window.skipInvite || window.skipInvite.__firstStarPatched) return;
    const original = window.skipInvite;
    window.skipInvite = async function () {
      if (!isGuideEnabled()) {
        return original.apply(this, arguments);
      }
      const errorEl = document.getElementById('step6Error');
      if (errorEl) errorEl.classList.add('hidden');
      showFirstStarGuide(function () {
        original.apply(window, arguments);
      });
    };
    window.skipInvite.__firstStarPatched = true;
  }

  /** Capture-phase hook so step6Btn also shows first star guide (not only skipInvite). */
  function patchStep6Btn() {
    const btn = document.getElementById('step6Btn');
    if (!btn || btn.dataset.firstStarPatched) return;
    btn.dataset.firstStarPatched = '1';
    btn.addEventListener('click', function (e) {
      if (!isGuideEnabled()) return;
      if (btn.dataset.firstStarDone === '1') return;
      e.stopImmediatePropagation();
      e.preventDefault();
      showFirstStarGuide(function () {
        btn.dataset.firstStarDone = '1';
        btn.click();
      });
    }, true);
  }

  function init() {
    if (typeof window.IS_ADD_CHILD !== 'undefined' && window.IS_ADD_CHILD) return;
    patchSkipInvite();
    patchStep6Btn();
  }

  window.OnboardingFirstStar = {
    init: init,
    show: showFirstStarGuide,
  };

  document.addEventListener('DOMContentLoaded', init);
})();
