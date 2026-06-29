/**
 * build-game-mobile.js — Mobilspel-substrat (touch, haptics, skak, scroll-lock).
 * Använder window.Platform på iOS/Android, fallbacks på webb.
 */
(function () {
  'use strict';

  let shakeHandler = null;
  let shakeLast = 0;
  let motionBound = false;
  let scrollLockCount = 0;

  function isNative() {
    return !!(window.Platform && Platform.isNative && Platform.isNative());
  }

  function isMobile() {
    if (isNative()) return true;
    return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  }

  async function haptic(kind) {
    const P = window.Platform && window.Platform.haptics;
    if (!P) {
      if (navigator.vibrate) {
        const patterns = {
          tick: 8,
          tool: 14,
          medium: 22,
          heavy: 40,
          success: [20, 40, 20],
          error: [60, 30, 60],
          unscrew: 12,
          splash: [10, 20, 10, 20],
        };
        navigator.vibrate(patterns[kind] || 10);
      }
      return;
    }
    switch (kind) {
      case 'tick': return P.light();
      case 'tool': return P.light();
      case 'medium': return P.medium();
      case 'heavy': return P.heavy();
      case 'success': return P.success();
      case 'error': return P.error();
      case 'unscrew': return P.light();
      case 'splash': return P.medium();
      default: return P.light();
    }
  }

  function lockScroll() {
    scrollLockCount++;
    document.documentElement.classList.add('bgm-scroll-lock');
    document.body.classList.add('bgm-scroll-lock');
  }

  function unlockScroll() {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
      document.documentElement.classList.remove('bgm-scroll-lock');
      document.body.classList.remove('bgm-scroll-lock');
    }
  }

  async function requestMotionPermission() {
    if (typeof DeviceMotionEvent === 'undefined') return false;
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const r = await DeviceMotionEvent.requestPermission();
        return r === 'granted';
      } catch (_) {
        return false;
      }
    }
    return true;
  }

  function bindShake(callback, opts) {
    opts = opts || {};
    const threshold = opts.threshold || 14;
    const cooldown = opts.cooldown || 700;

    unbindShake();
    shakeHandler = function (e) {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const now = Date.now();
      if (mag > threshold && now - shakeLast > cooldown) {
        shakeLast = now;
        callback({ magnitude: mag });
      }
    };

    if (!motionBound) {
      window.addEventListener('devicemotion', shakeHandler, { passive: true });
      motionBound = true;
    } else {
      window.removeEventListener('devicemotion', shakeHandler);
      window.addEventListener('devicemotion', shakeHandler, { passive: true });
    }
  }

  function unbindShake() {
    if (shakeHandler && motionBound) {
      window.removeEventListener('devicemotion', shakeHandler);
    }
    shakeHandler = null;
  }

  function bindDrag(el, opts) {
    if (!el) return function () {};
    opts = opts || {};
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;

    function onDown(e) {
      if (opts.onlyIf && !opts.onlyIf()) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      dy = 0;
      el.setPointerCapture(e.pointerId);
      if (opts.onStart) opts.onStart(e);
      haptic('tick');
    }

    function onMove(e) {
      if (!dragging) return;
      dx = e.clientX - startX;
      dy = e.clientY - startY;
      if (opts.onMove) opts.onMove(dx, dy, e);
    }

    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
      if (opts.onEnd) opts.onEnd(dx, dy, e);
    }

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);

    return function cleanup() {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }

  function burst(container, emoji, count) {
    if (!container) return;
    const n = count || 8;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('span');
      el.className = 'bgm-burst-particle';
      el.textContent = emoji;
      el.style.left = (15 + Math.random() * 70) + '%';
      el.style.top = (20 + Math.random() * 55) + '%';
      el.style.animationDelay = (Math.random() * 0.25) + 's';
      container.appendChild(el);
      setTimeout(function () { el.remove(); }, 900);
    }
  }

  window.BuildGameMobile = {
    isNative: isNative,
    isMobile: isMobile,
    haptic: haptic,
    lockScroll: lockScroll,
    unlockScroll: unlockScroll,
    requestMotionPermission: requestMotionPermission,
    bindShake: bindShake,
    unbindShake: unbindShake,
    bindDrag: bindDrag,
    burst: burst,
  };
})();
