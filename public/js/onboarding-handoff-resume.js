/**
 * onboarding-handoff-resume.js — PR 3 email reminder → step 5 handoff resume.
 * Loaded before onboarding.js. No PIN fetch — username/name only.
 */
(function () {
  'use strict';

  const RESUME_PARAM = 'child-handoff';
  let active = false;

  function isResumeHandoffQuery() {
    try {
      return new URLSearchParams(window.location.search).get('resume') === RESUME_PARAM;
    } catch (_) {
      return false;
    }
  }

  function isActive() {
    return active;
  }

  function trackEvent(eventType, metadata) {
    if (!window.apiFetch) return;
    window.apiFetch('/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType, metadata: metadata || {} }),
    }).catch(function () {});
  }

  function hydrateStep5(ctx) {
    if (!ctx) return;
    window.dispatchEvent(new CustomEvent('onboarding:child-created', {
      detail: {
        id: ctx.child_id,
        name: ctx.child_name,
        username: ctx.child_username,
      },
    }));
    if (window.OnboardingActivation && typeof OnboardingActivation.setChildId === 'function' && ctx.child_id) {
      OnboardingActivation.setChildId(ctx.child_id);
    }
    const s5Pin = document.getElementById('s5Pin');
    if (s5Pin) s5Pin.textContent = '••••';
    const hint = document.getElementById('s5PinResumeHint');
    if (hint) hint.classList.remove('hidden');
  }

  /**
   * @param {typeof fetch} apiFetch
   * @returns {Promise<{ action: 'handoff'|'dashboard'|'normal_onboarding'|'skip', ctx?: object }>}
   */
  async function handleResume(apiFetch) {
    if (!isResumeHandoffQuery()) {
      return { action: 'skip' };
    }
    const fetchFn = apiFetch || window.apiFetch;
    if (!fetchFn) {
      return { action: 'normal_onboarding' };
    }
    try {
      const res = await fetchFn('/api/onboarding/handoff-context');
      if (!res.ok) {
        return { action: 'normal_onboarding' };
      }
      const ctx = await res.json();
      if (ctx.can_resume_handoff) {
        active = true;
        hydrateStep5(ctx);
        trackEvent('child_handoff_reminder_landed', {
          source: 'email',
          child_id: ctx.child_id,
          reason: ctx.reason,
        });
        return { action: 'handoff', ctx };
      }
      if (ctx.reason === 'no_schema' || ctx.reason === 'no_child') {
        return { action: 'normal_onboarding' };
      }
      return { action: 'dashboard' };
    } catch (_) {
      return { action: 'normal_onboarding' };
    }
  }

  window.OnboardingHandoffResume = {
    isResumeHandoffQuery,
    isActive,
    handleResume,
    hydrateStep5,
  };
})();
