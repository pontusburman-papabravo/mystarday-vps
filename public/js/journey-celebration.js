/**
 * journey-celebration.js — celebration modal driven by Journey Context.
 * Experience Pack copy when platform runtime provides celebration_copy on context.
 */
(function () {
  'use strict';

  const MODAL_ID = 'journeyCelebrationModal';
  let polling = false;

  function getModal() {
    return document.getElementById(MODAL_ID);
  }

  async function showCelebration(registry, celebrationCopy) {
    const modal = getModal();
    if (!modal) return;

    const exp = registry?.phases?.BUILDING_ROUTINE?.celebrate_first_success || {};
    const headline = document.getElementById('journeyCelebrationHeadline');
    const body = document.getElementById('journeyCelebrationBody');
    const btn = document.getElementById('journeyCelebrationDismissBtn');

    if (headline) {
      headline.textContent = celebrationCopy?.headline || exp.headline || 'Ni gjorde det tillsammans';
    }
    if (body) {
      body.textContent = celebrationCopy?.body || exp.body || 'Barnet började — och du såg det.';
    }
    if (btn) {
      btn.textContent = celebrationCopy?.cta || exp.cta || 'Vad fint';
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function hideCelebration() {
    const modal = getModal();
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  async function dismissCelebration() {
    hideCelebration();
    if (window.JourneyContextClient) {
      await JourneyContextClient.postEvent('celebration_dismissed');
    }
  }

  async function pollCelebration() {
    if (polling || !window.JourneyContextClient) return;
    polling = true;
    try {
      const enabled = await JourneyContextClient.isJourneyApiEnabled();
      if (!enabled) return;

      const ctx = await JourneyContextClient.fetchContext();
      if (ctx?.celebration === 'celebrate_first_success') {
        const registry = await JourneyContextClient.fetchRegistry();
        await showCelebration(registry, ctx.celebration_copy);
      }
    } finally {
      polling = false;
    }
  }

  function init() {
    const btn = document.getElementById('journeyCelebrationDismissBtn');
    if (btn) btn.addEventListener('click', dismissCelebration);

    const modal = getModal();
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) dismissCelebration();
      });
    }

    pollCelebration();
    setInterval(pollCelebration, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.JourneyCelebration = {
    pollCelebration,
    dismissCelebration,
  };
})();
