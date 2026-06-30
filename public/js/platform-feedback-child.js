/**
 * platform-feedback-child.js — First-completion world whisper from Experience Pack.
 * Does not duplicate dopamin burst / "Du klarade det!" — only a gentle Morgonhuset hint.
 */
(function () {
  'use strict';

  const TOAST_ID = 'platformFeedbackToast';
  const WHISPER_MAX_MS = 2200;

  function ensureToast() {
    let el = document.getElementById(TOAST_ID);
    if (el) return el;

    el = document.createElement('div');
    el.id = TOAST_ID;
    el.className = 'hidden fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] max-w-xs text-center pointer-events-none';
    el.setAttribute('role', 'status');
    el.innerHTML = '<p class="platform-feedback-whisper text-sm font-heading text-navy/80 italic px-4 py-2 rounded-full bg-white/80 shadow-md border border-amber-50/80 backdrop-blur-sm"></p>';
    document.body.appendChild(el);
    return el;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function showWhisper(hint) {
    if (!hint) return;

    const toast = ensureToast();
    const line = toast.querySelector('.platform-feedback-whisper');
    if (!line) return;

    line.textContent = hint;
    toast.classList.remove('hidden');

    const duration = prefersReducedMotion() ? 900 : WHISPER_MAX_MS;
    setTimeout(() => toast.classList.add('hidden'), duration);
  }

  async function fetchFeedback() {
    try {
      return await window.Auth.api('/api/me/platform-feedback');
    } catch (err) {
      console.warn('[platform-feedback] fetch failed:', err.message);
      return null;
    }
  }

  async function onActivityCompleted() {
    const data = await fetchFeedback();
    if (!data?.is_first_completion) return;
    showWhisper(data.world_hint);
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
    showWhisper,
    onActivityCompleted,
  };
})();
