/**
 * home-primary-action.js — R1: one primary coach on Hem (PA-01 / PA-02).
 * Journey wins when it has a relevant step; secondary coach mounts are hidden, not removed.
 */
(function () {
  'use strict';

  const COACH_MOUNT_IDS = [
    'journeyCoachMount',
    'activationFirstSuccessCoachMount',
    'engineCoachMount',
  ];

  function mountEl(id) {
    return document.getElementById(id);
  }

  function isVisibleCoachMount(el) {
    if (!el || el.classList.contains('hidden')) return false;
    const html = (el.innerHTML || '').trim();
    if (!html) return false;
    return !!(
      el.querySelector('.journey-coach-card, .activation-fs-coach, .engine-coach-card, [role="region"]')
    );
  }

  function journeyHasRelevantStep() {
    const mount = mountEl('journeyCoachMount');
    if (!isVisibleCoachMount(mount)) return false;
    const ctx = window.__journeyCoachLastContext;
    if (!ctx || !ctx.recommended_experiences || !ctx.recommended_experiences[0]) {
      return true;
    }
    const expKey = ctx.recommended_experiences[0];
    if (expKey.startsWith('fw_')) return false;
    const sj = expKey.startsWith('sj_');
    const allowed = sj
      ? ['coach', 'celebration', 'reflection'].includes(ctx.priority)
      : ctx.priority === 'coach';
    return allowed;
  }

  function activationHasPrimary() {
    return isVisibleCoachMount(mountEl('activationFirstSuccessCoachMount'));
  }

  function engineHasPrimary() {
    return isVisibleCoachMount(mountEl('engineCoachMount'));
  }

  function hideMount(id) {
    const el = mountEl(id);
    if (!el) return;
    el.classList.add('hidden');
  }

  function showMount(id) {
    const el = mountEl(id);
    if (el) el.classList.remove('hidden');
  }

  function activationRetentionOwnsHome() {
    const hub = window.ActivationFirstSuccessHub;
    if (!hub || typeof hub.getCachedPayload !== 'function') return false;
    const p = hub.getCachedPayload();
    return Boolean(p && p.enabled && p.authority === 'journey_retention');
  }

  function resolveWinner() {
    if (window.EngineClient &&
      typeof EngineClient.isReadinessBlockingCoach === 'function' &&
      EngineClient.isReadinessBlockingCoach()) {
      return { winner: 'none', reason: 'readiness' };
    }
    if (activationRetentionOwnsHome()) {
      if (activationHasPrimary()) return { winner: 'activation' };
      return { winner: 'none', reason: 'journey_retention_silent' };
    }
    if (journeyHasRelevantStep()) return { winner: 'journey' };
    if (activationHasPrimary()) return { winner: 'activation' };
    if (engineHasPrimary()) return { winner: 'engine' };
    return { winner: 'none' };
  }

  function apply() {
    const { winner } = resolveWinner();
    const show = {
      journey: winner === 'journey',
      activation: winner === 'activation',
      engine: winner === 'engine',
    };
    hideMount('journeyCoachMount');
    hideMount('activationFirstSuccessCoachMount');
    hideMount('engineCoachMount');
    if (show.journey) showMount('journeyCoachMount');
    if (show.activation) showMount('activationFirstSuccessCoachMount');
    if (show.engine) showMount('engineCoachMount');
    return { winner };
  }

  window.HomePrimaryAction = {
    apply,
    resolveWinner,
    journeyHasRelevantStep,
    COACH_MOUNT_IDS,
  };
})();
