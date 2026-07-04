/**
 * platform-feedback-child.js — First-completion world whisper from Experience Pack.
 * Does not duplicate dopamin burst / "Du klarade det!" — only a gentle Morgonhuset hint.
 */
(function () {
  'use strict';

  const TOAST_ID = 'platformFeedbackToast';
  const WHISPER_MIN_MS = 4800;
  const WHISPER_REDUCED_MS = 2200;
  const SHOW_DELAY_MS = 900;

  let _pendingHint = null;
  let _hintShownThisSession = false;
  let _hideTimer = null;

  function ensureToast() {
    let el = document.getElementById(TOAST_ID);
    if (el) return el;

    el = document.createElement('div');
    el.id = TOAST_ID;
    el.className = 'hidden fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] max-w-xs text-center';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<button type="button" class="platform-feedback-whisper text-sm font-heading text-navy/80 italic px-4 py-2 rounded-full bg-white/90 shadow-md border border-amber-50/80 backdrop-blur-sm min-h-[44px]" aria-label="Stäng meddelande"></button>';
    el.querySelector('button').addEventListener('click', function () {
      hideWhisper();
    });
    document.body.appendChild(el);
    return el;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function hideWhisper() {
    const toast = document.getElementById(TOAST_ID);
    if (!toast) return;
    toast.classList.add('hidden');
    if (_hideTimer) {
      clearTimeout(_hideTimer);
      _hideTimer = null;
    }
    _pendingHint = null;
  }

  function showWhisper(hint) {
    if (!hint) return;

    const toast = ensureToast();
    const btn = toast.querySelector('.platform-feedback-whisper');
    if (!btn) return;

    btn.textContent = hint;
    toast.classList.remove('hidden');
    _hintShownThisSession = true;
    _pendingHint = null;

    if (_hideTimer) clearTimeout(_hideTimer);
    const duration = prefersReducedMotion() ? WHISPER_REDUCED_MS : WHISPER_MIN_MS;
    _hideTimer = setTimeout(hideWhisper, duration);
  }

  function showPendingHintIfAny() {
    if (_hintShownThisSession || !_pendingHint) return false;
    showWhisper(_pendingHint);
    return true;
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
    if (!data?.is_first_completion || !data.world_hint) return;

    _pendingHint = data.world_hint;
    setTimeout(function () {
      if (!_pendingHint) return;
      showWhisper(_pendingHint);
    }, SHOW_DELAY_MS);
  }

  function init() {
    if (window.ChildEventBus) {
      ChildEventBus.on('ActivityCompleted', onActivityCompleted);
    }

    window.addEventListener('online', async function () {
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
    fetchFeedback: fetchFeedback,
    showWhisper: showWhisper,
    hideWhisper: hideWhisper,
    showPendingHintIfAny: showPendingHintIfAny,
    onActivityCompleted: onActivityCompleted,
  };
})();
