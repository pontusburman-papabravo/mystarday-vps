/**
 * onboarding-handoff-film.js — ACT-1 handoff film after schema save.
 * Music + on-screen text only (no voiceover). Drives parent to child login.
 */
(function () {
  'use strict';

  const SCENES = [
    { id: 'routine', caption: 'Rutinen är klar', durationMs: 3000 },
    { id: 'handoff', caption: 'Öppna barnläget tillsammans', durationMs: 4000 },
    { id: 'child', caption: 'Barnet ser vad som händer nu', durationMs: 4000 },
    { id: 'done', caption: 'Klart!', durationMs: 4000 },
    { id: 'star', caption: 'Första stjärnan ⭐', durationMs: 4000 },
  ];

  const TOTAL_MS = SCENES.reduce(function (sum, s) { return sum + s.durationMs; }, 0);

  let config = null;
  let shownThisSession = false;
  let audioCtx = null;
  let musicNodes = null;
  let musicMuted = false;

  function act() {
    return window.OnboardingActivation || null;
  }

  function trackEvent(eventType, metadata) {
    const oa = act();
    if (oa && typeof oa.trackEvent === 'function') {
      oa.trackEvent(eventType, metadata);
    } else if (window.apiFetch) {
      window.apiFetch('/api/analytics/event', {
        method: 'POST',
        body: JSON.stringify({ event_type: eventType, metadata: metadata || {} }),
      }).catch(function () {});
    }
  }

  function isSlimFastPath() {
    if (window.OnboardingStarterPlan && typeof OnboardingStarterPlan.isSlimFastPath === 'function') {
      return OnboardingStarterPlan.isSlimFastPath();
    }
    const oa = act();
    if (!oa || typeof oa.getConfig !== 'function') return false;
    const cfg = oa.getConfig();
    return Boolean(cfg && cfg.flags && cfg.flags.activation_signup_slim_v1);
  }

  function isFilmEnabled() {
    if (typeof window.IS_ADD_CHILD !== 'undefined' && window.IS_ADD_CHILD) return false;
    if (isSlimFastPath()) return false;
    const oa = act();
    if (!oa || typeof oa.getConfig !== 'function') return false;
    const cfg = oa.getConfig();
    return Boolean(cfg && cfg.flags && cfg.flags.activation_onboarding_handoff_film_v1);
  }

  function childId() {
    const oa = act();
    return oa && typeof oa.getChildId === 'function' ? oa.getChildId() : null;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }

  function stopMusic() {
    if (!musicNodes) return;
    try {
      musicNodes.forEach(function (node) {
        if (node.gain) {
          node.gain.gain.setValueAtTime(node.gain.gain.value, audioCtx.currentTime);
          node.gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.25);
        }
        if (node.osc) node.osc.stop(audioCtx.currentTime + 0.3);
      });
    } catch (_) {}
    musicNodes = null;
  }

  function startMusic() {
    if (musicMuted || prefersReducedMotion()) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const freqs = [261.63, 329.63, 392.0, 523.25];
      musicNodes = freqs.map(function (freq, i) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const vol = 0.018 - i * 0.003;
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        return { osc: osc, gain: gain };
      });
    } catch (_) {}
  }

  function toggleMute(btn) {
    musicMuted = !musicMuted;
    if (musicMuted) {
      stopMusic();
      btn.textContent = '🔇';
      btn.setAttribute('aria-label', 'Ljud av — tryck för att sätta på');
    } else {
      startMusic();
      btn.textContent = '🔊';
      btn.setAttribute('aria-label', 'Ljud på — tryck för att stänga av');
    }
  }

  function sceneHtml(sceneId) {
    if (sceneId === 'routine') {
      return [
        '<div class="ohf-mock">',
        '  <div class="ohf-mock-header">Dagens rutin</div>',
        '  <div class="ohf-activity-row" data-ohf-row="0"><span class="ohf-emoji">👕</span> Klä på sig <span class="ohf-check">✓</span></div>',
        '  <div class="ohf-activity-row" data-ohf-row="1"><span class="ohf-emoji">🪥</span> Borsta tänderna <span class="ohf-check">✓</span></div>',
        '  <div class="ohf-activity-row" data-ohf-row="2"><span class="ohf-emoji">🎒</span> Packa väskan <span class="ohf-check">✓</span></div>',
        '</div>',
      ].join('');
    }
    if (sceneId === 'handoff') {
      return '<div class="ohf-btn-mock" id="ohfHandoffBtn">Testa barnläget</div>';
    }
    if (sceneId === 'child') {
      return [
        '<div class="ohf-mock ohf-child-card">',
        '  <div class="ohf-child-emoji">🪥</div>',
        '  <div class="font-bold text-navy text-base">Borsta tänderna</div>',
        '  <div class="ohf-child-action" id="ohfChildTap">Markera klar ✓</div>',
        '</div>',
      ].join('');
    }
    if (sceneId === 'done') {
      return [
        '<div class="ohf-mock ohf-child-card">',
        '  <div class="ohf-child-emoji" style="font-size:40px">✅</div>',
        '  <div class="font-bold text-green-600 text-lg">Bra jobbat!</div>',
        '</div>',
      ].join('');
    }
    return [
      '<div class="ohf-star-burst">⭐</div>',
      '<div class="ohf-star-trail"><span>⭐</span><span>⭐</span><span>⭐</span></div>',
    ].join('');
  }

  function runSceneFx(sceneId, root) {
    if (sceneId === 'routine') {
      const rows = root.querySelectorAll('[data-ohf-row]');
      rows.forEach(function (row, i) {
        setTimeout(function () { row.classList.add('is-done'); }, 400 + i * 500);
      });
    }
    if (sceneId === 'handoff') {
      const btn = root.querySelector('#ohfHandoffBtn');
      if (btn) setTimeout(function () { btn.classList.add('is-pressed'); }, 1200);
    }
    if (sceneId === 'child') {
      const tap = root.querySelector('#ohfChildTap');
      if (tap) setTimeout(function () { tap.classList.add('is-tapped'); }, 1400);
    }
  }

  function openChildLogin() {
    const oa = act();
    if (oa && typeof oa.startChildHandoff === 'function') {
      oa.startChildHandoff('onboarding_film');
      return;
    }
    if (window.DashboardChildHandoff && DashboardChildHandoff.startChildLogin) {
      DashboardChildHandoff.startChildLogin();
      return;
    }
    window.location.href = '/child-login';
  }

  async function completeOnboardingAndGoHome() {
    try {
      if (window.apiFetch) {
        await window.apiFetch('/api/onboarding/complete', { method: 'POST' });
      }
      const user = window.Auth && Auth.getUser();
      if (user) {
        user.onboarding_completed = true;
        if (window.Auth && Auth.setAuth) Auth.setAuth(Auth.getToken(), user);
      }
    } catch (_) {}
    window.location.href = '/dashboard';
  }

  /**
   * @param {{ onFallback?: function }} [opts]
   * @returns {Promise<'film'|'fallback'|'skip'>}
   */
  function showHandoffFilm(opts) {
    opts = opts || {};
    if (shownThisSession || !isFilmEnabled()) {
      if (opts.onFallback) opts.onFallback();
      return Promise.resolve('fallback');
    }
    shownThisSession = true;

    const reduced = prefersReducedMotion();

    const overlay = document.createElement('div');
    overlay.id = 'onboardingHandoffFilm';
    overlay.className = 'ohf-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'ohfCaption');

    const scenesHtml = SCENES.map(function (scene, i) {
      return [
        '<div class="ohf-scene' + (i === 0 && !reduced ? ' is-active' : '') + '" data-scene="' + scene.id + '">',
        sceneHtml(scene.id),
        '</div>',
      ].join('');
    }).join('');

    const dotsHtml = SCENES.map(function (_, i) {
      return '<span class="ohf-dot' + (i === 0 ? ' is-active' : '') + '" data-dot="' + i + '"></span>';
    }).join('');

    overlay.innerHTML = [
      '<div class="ohf-card">',
      '  <button type="button" class="ohf-mute-btn" id="ohfMuteBtn" aria-label="Ljud på — tryck för att stänga av">🔊</button>',
      '  <div class="ohf-stage" id="ohfStage">',
      scenesHtml,
      '  </div>',
      '  <p class="ohf-caption" id="ohfCaption">' + esc(SCENES[0].caption) + '</p>',
      '  <div class="ohf-progress" aria-hidden="true">' + dotsHtml + '</div>',
      '  <div class="ohf-cta-panel' + (reduced ? ' is-visible' : '') + '" id="ohfCtaPanel">',
      '    <h2 class="ohf-cta-title">Redo att testa?</h2>',
      '    <button type="button" class="ohf-cta-primary" id="ohfTryChildBtn">Testa barnläget nu</button>',
      '    <button type="button" class="ohf-cta-secondary" id="ohfLaterBtn">Gör det senare</button>',
      '  </div>',
      '</div>',
    ].join('');

    document.body.appendChild(overlay);

    trackEvent('onboarding_handoff_film_shown', { child_id: childId(), reduced_motion: reduced });

    const muteBtn = overlay.querySelector('#ohfMuteBtn');
    if (muteBtn) muteBtn.addEventListener('click', function () { toggleMute(muteBtn); });

    startMusic();

    const captionEl = overlay.querySelector('#ohfCaption');
    const ctaPanel = overlay.querySelector('#ohfCtaPanel');
    const sceneEls = overlay.querySelectorAll('.ohf-scene');
    const dotEls = overlay.querySelectorAll('.ohf-dot');

    function teardown() {
      stopMusic();
      overlay.remove();
    }

    function showCta() {
      ctaPanel.classList.add('is-visible');
      captionEl.textContent = '';
    }

    overlay.querySelector('#ohfTryChildBtn').addEventListener('click', function () {
      trackEvent('onboarding_handoff_film_cta_try', { child_id: childId() });
      teardown();
      openChildLogin();
    });

    overlay.querySelector('#ohfLaterBtn').addEventListener('click', function () {
      trackEvent('onboarding_handoff_film_cta_later', { child_id: childId() });
      teardown();
      completeOnboardingAndGoHome();
    });

    if (reduced) {
      return Promise.resolve('film');
    }

    let idx = 0;
    let elapsed = 0;

    function activateScene(i) {
      sceneEls.forEach(function (el, j) {
        el.classList.toggle('is-active', j === i);
      });
      dotEls.forEach(function (el, j) {
        el.classList.toggle('is-active', j === i);
      });
      captionEl.textContent = SCENES[i].caption;
      runSceneFx(SCENES[i].id, sceneEls[i]);
    }

    activateScene(0);

    const timer = setInterval(function () {
      elapsed += 200;
      const scene = SCENES[idx];
      if (elapsed >= scene.durationMs) {
        elapsed = 0;
        idx += 1;
        if (idx >= SCENES.length) {
          clearInterval(timer);
          showCta();
          trackEvent('onboarding_handoff_film_complete', { child_id: childId(), duration_ms: TOTAL_MS });
          return;
        }
        activateScene(idx);
      }
    }, 200);

    return Promise.resolve('film');
  }

  /**
   * Intercept handoff step — show film instead of step 5 when enabled.
   * @param {function} [fallback] called when film disabled (typically goToStep(5))
   */
  function maybeShowInsteadOfHandoffStep(fallback) {
    if (!isFilmEnabled()) {
      if (typeof fallback === 'function') fallback();
      return;
    }
    if (typeof populateStep5LoginInfo === 'function') populateStep5LoginInfo();
    showHandoffFilm();
  }

  /** Called after schema save (+ optional activity guide) — film or legacy step 5. */
  function goToHandoffAfterSchema() {
    maybeShowInsteadOfHandoffStep(function () {
      if (typeof goToStep === 'function') goToStep(5);
    });
  }

  function init() {
    if (typeof window.IS_ADD_CHILD !== 'undefined' && window.IS_ADD_CHILD) return;
    const oa = act();
    if (oa && typeof oa.loadConfig === 'function') {
      oa.loadConfig().catch(function () {});
    }
  }

  window.OnboardingHandoffFilm = {
    init: init,
    show: showHandoffFilm,
    maybeShowInsteadOfHandoffStep: maybeShowInsteadOfHandoffStep,
    goToHandoffAfterSchema: goToHandoffAfterSchema,
    isEnabled: isFilmEnabled,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
