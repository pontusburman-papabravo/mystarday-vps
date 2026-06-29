/**
 * platform-feedback-child.js — Experience Pack feedback after activity completion.
 * Temporary UI component proving Platform Runtime integration (POS C-04, G-01).
 */
(function () {
  'use strict';

  const TOAST_ID = 'platformFeedbackToast';
  const CELEBRATION_MAX_MS = 2000;

  function ensureToast() {
    let el = document.getElementById(TOAST_ID);
    if (el) return el;

    el = document.createElement('div');
    el.id = TOAST_ID;
    el.className = 'hidden fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-white/95 text-navy px-5 py-3 rounded-2xl shadow-xl font-heading font-semibold text-sm max-w-xs text-center border border-amber-100';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
    return el;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function showFeedback(data) {
    if (!data) return;

    const message = data.message || (data.world_feedback && data.world_feedback[0]?.child_message);
    const hint = data.world_hint || (data.world_feedback && data.world_feedback[0]?.first_enter_message);
    if (!message && !hint) return;

    const toast = ensureToast();
    const lines = [message, hint].filter(Boolean);
    toast.textContent = lines.join(' — ');
    toast.classList.remove('hidden');

    const duration = prefersReducedMotion() ? 800 : CELEBRATION_MAX_MS;
    setTimeout(() => toast.classList.add('hidden'), duration);
  }

  async function fetchFeedback() {
    try {
      const res = await window.Auth.api('/api/me/platform-feedback');
      return res;
    } catch (err) {
      console.warn('[platform-feedback] fetch failed:', err.message);
      return null;
    }
  }

  async function onActivityCompleted() {
    const data = await fetchFeedback();
    showFeedback(data);
  }

  function init() {
    if (window.ChildEventBus) {
      ChildEventBus.on('ActivityCompleted', onActivityCompleted);
    }

    window.addEventListener('online', async () => {
      try {
        await window.Auth.api('/api/me/platform-feedback/replay', { method: 'POST' });
      } catch (_) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.PlatformFeedback = {
    fetchFeedback,
    showFeedback,
    onActivityCompleted,
  };
})();
