/**
 * onboarding-activation.js — child handoff + first star guide (flag-gated).
 */
(function () {
  'use strict';

  let config = null;
  let childId = null;
  let handoffWired = false;

  function api(path, opts) {
    if (!window.apiFetch) return Promise.reject(new Error('no api'));
    return window.apiFetch(path, opts);
  }

  function trackEvent(eventType, metadata) {
    api('/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType, metadata: metadata || {} }),
    }).catch(function () {});
  }

  function loadConfig() {
    return api('/api/family/activation-config')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        config = data || { flags: {} };
        return config;
      })
      .catch(function () {
        config = { flags: {} };
        return config;
      });
  }

  function recordChildAccess(source) {
    return api('/api/onboarding/child-access-complete', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, source: source }),
    });
  }

  function buildLoginInfoText() {
    const nameEl = document.getElementById('s5ChildName');
    const pinEl = document.getElementById('s5Pin');
    const childName = nameEl ? nameEl.textContent.trim() : 'Barnet';
    const pin = pinEl ? pinEl.textContent.trim() : '';
    return [
      'Inloggning till [REDACTED] för ' + childName + ':',
      '',
      '1. Gå till [REDACTED]/child-login',
      '2. Välj barnet och ange PIN: ' + pin,
    ].join('\n');
  }

  function openChildLogin() {
    if (window.DashboardChildHandoff && DashboardChildHandoff.startChildLogin) {
      DashboardChildHandoff.startChildLogin();
    } else {
      window.location.href = '/child-login';
    }
  }

  function startChildHandoff(source) {
    const src = source || 'handoff';
    trackEvent('child_view_opened', { child_id: childId, source: src });
    return recordChildAccess('child_view').finally(function () {
      openChildLogin();
    });
  }

  function wireStep5Handoff() {
    if (handoffWired) return;
    const loginBtn = document.getElementById('step5ChildLoginBtn');
    const continueBtn = document.getElementById('step5ContinueParentBtn');
    if (!loginBtn || !continueBtn) return;
    handoffWired = true;

    loginBtn.addEventListener('click', function () {
      startChildHandoff('step5_primary_cta');
    });

    continueBtn.addEventListener('click', function () {
      trackEvent('child_handoff_skipped', { child_id: childId, source: 'step5_continue_parent' });
      if (typeof window.goToStep === 'function') window.goToStep(6);
    });
  }

  function showFirstStarGuide(onDone) {
    if (!config || !config.flags.activation_first_star_guide_v1) {
      onDone();
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'firstStarGuideOverlay';
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4';
    overlay.innerHTML = [
      '<div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">',
      '  <div class="text-center mb-4"><div class="text-4xl mb-2">⭐</div>',
      '  <h2 class="text-xl font-heading font-bold text-navy mb-2">Ge första stjärnan</h2>',
      '  <p class="text-sm text-text-soft mb-4">Tre snabba steg — sedan är ni igång på riktigt.</p></div>',
      '  <ol class="text-sm text-navy space-y-2 mb-5 list-decimal list-inside">',
      '    <li>Låt barnet logga in med PIN-koden</li>',
      '    <li>Markera en aktivitet som klar i barnvyn</li>',
      '    <li>Fira stjärnan tillsammans!</li>',
      '  </ol>',
      '  <button type="button" id="fsgChildLogin" class="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3 rounded-xl">👶 Öppna barninloggning</button>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);

    document.getElementById('fsgChildLogin').addEventListener('click', function () {
      trackEvent('child_view_opened', { child_id: childId, source: 'first_star_guide' });
      overlay.remove();
      openChildLogin();
    });
  }

  function patchSkipInvite() {
    if (!window.skipInvite || window.skipInvite.__activationPatched) return;
    const original = window.skipInvite;
    window.skipInvite = async function () {
      if (!config || !config.flags.activation_first_star_guide_v1) {
        return original.apply(this, arguments);
      }
      const errorEl = document.getElementById('step6Error');
      if (errorEl) errorEl.classList.add('hidden');
      showFirstStarGuide(function () {
        original.apply(window, arguments);
      });
    };
    window.skipInvite.__activationPatched = true;
  }

  /** Capture-phase hook so step6Btn also shows first star guide (not only skipInvite). */
  function patchStep6Btn() {
    const btn = document.getElementById('step6Btn');
    if (!btn || btn.dataset.firstStarPatched) return;
    btn.dataset.firstStarPatched = '1';
    btn.addEventListener('click', function (e) {
      if (!config || !config.flags.activation_first_star_guide_v1) return;
      if (btn.dataset.firstStarDone === '1') return;
      e.stopImmediatePropagation();
      e.preventDefault();
      showFirstStarGuide(function () {
        btn.dataset.firstStarDone = '1';
        btn.click();
      });
    }, true);
  }

  function notifyPinSet(source) {
    if (!config || !config.flags.activation_child_handoff_v1) return;
    trackEvent('child_pin_created', {
      child_id: childId,
      source: source || 'onboarding_step5',
    });
  }

  function init() {
    if (typeof window.IS_ADD_CHILD !== 'undefined' && window.IS_ADD_CHILD) return;
    loadConfig().then(function () {
      patchSkipInvite();
      patchStep6Btn();
      wireStep5Handoff();
      const obs = new MutationObserver(function () {
        const step5 = document.getElementById('step5');
        if (step5 && step5.classList.contains('active')) wireStep5Handoff();
      });
      const root = document.getElementById('onboardingRoot') || document.body;
      obs.observe(root, { attributes: true, subtree: true, attributeFilter: ['class'] });
    });
  }

  window.OnboardingActivation = {
    init: init,
    setChildId: function (id) { childId = id; },
    startChildHandoff: startChildHandoff,
    recordChildAccess: recordChildAccess,
    notifyPinSet: notifyPinSet,
  };

  document.addEventListener('DOMContentLoaded', init);
})();
