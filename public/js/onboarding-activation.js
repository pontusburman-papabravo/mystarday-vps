/**
 * onboarding-activation.js — ACT-1 child handoff step (flag-gated).
 * First star guide lives in onboarding-first-star.js.
 */
(function () {
  'use strict';

  let config = null;
  let childId = null;
  let handoffWired = false;
  let onboardingStartedTracked = false;

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

  function isHandoffEnabled() {
    return Boolean(config && config.flags && config.flags.activation_child_handoff_v1);
  }

  function isAnyAct1OnboardingFlagEnabled() {
    if (!config || !config.flags) return false;
    return Boolean(
      config.flags.activation_child_handoff_v1
      || config.flags.activation_first_star_guide_v1
      || config.flags.activation_onboarding_v1
    );
  }

  function recordChildAccess(source) {
    return api('/api/onboarding/child-access-complete', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, source: source }),
    });
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
    if (isHandoffEnabled()) {
      trackEvent('child_view_opened', { child_id: childId, source: src });
      return recordChildAccess('child_view').finally(function () {
        openChildLogin();
      });
    }
    openChildLogin();
    return Promise.resolve();
  }

  function confirmHandoffSkip(onConfirm) {
    const overlay = document.createElement('div');
    overlay.id = 'childHandoffSkipOverlay';
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'handoffSkipTitle');
    overlay.innerHTML = [
      '<div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">',
      '  <h2 id="handoffSkipTitle" class="text-lg font-heading font-bold text-navy mb-2">Hoppa över barninloggning?</h2>',
      '  <p class="text-sm text-text-soft mb-4 leading-relaxed">',
      '    Barnet behöver PIN-koden för att logga in själv. Utan test nu kan morgonrutinen kännas krångligare — vi skickar en påminnelse om 24 timmar om barnet inte testat än.',
      '  </p>',
      '  <div class="flex flex-col gap-2">',
      '    <button type="button" id="handoffSkipConfirmLogin" class="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3 rounded-xl">👶 Testa barninloggning</button>',
      '    <button type="button" id="handoffSkipConfirmSkip" class="w-full text-sm font-semibold text-text-soft hover:text-navy py-2">Hoppa över ändå</button>',
      '  </div>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);

    document.getElementById('handoffSkipConfirmLogin').addEventListener('click', function () {
      overlay.remove();
      startChildHandoff('step5_skip_dialog_primary');
    });
    document.getElementById('handoffSkipConfirmSkip').addEventListener('click', function () {
      overlay.remove();
      onConfirm();
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
      function goToInviteStep() {
        if (typeof window.goToStep === 'function') window.goToStep(6);
      }
      if (!isHandoffEnabled()) {
        goToInviteStep();
        return;
      }
      confirmHandoffSkip(function () {
        trackEvent('child_handoff_skipped', { child_id: childId, source: 'step5_continue_parent' });
        goToInviteStep();
      });
    });
  }

  function notifyPinSet(source) {
    if (!isHandoffEnabled()) return;
    trackEvent('child_pin_created', {
      child_id: childId,
      source: source || 'onboarding_step5',
    });
  }

  function maybeTrackOnboardingStarted() {
    if (onboardingStartedTracked || !isAnyAct1OnboardingFlagEnabled()) return;
    onboardingStartedTracked = true;
    trackEvent('activation_onboarding_started', { source: 'onboarding_entry' });
  }

  function init() {
    if (typeof window.IS_ADD_CHILD !== 'undefined' && window.IS_ADD_CHILD) return;
    loadConfig().then(function () {
      maybeTrackOnboardingStarted();
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
    getChildId: function () { return childId; },
    getConfig: function () { return config; },
    isHandoffEnabled: isHandoffEnabled,
    trackEvent: trackEvent,
    startChildHandoff: startChildHandoff,
    recordChildAccess: recordChildAccess,
    openChildLogin: openChildLogin,
    notifyPinSet: notifyPinSet,
  };

  document.addEventListener('DOMContentLoaded', init);
})();
