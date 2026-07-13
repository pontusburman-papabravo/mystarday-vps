/**
 * onboarding-handoff-film.js — ACT-1 handoff film after schema save.
 * On-screen text only (no voiceover, no music). Drives parent to child login.
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

  let shownThisSession = false;

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

  function brandLabel() {
    return ['Min', ['Stj', String.fromCharCode(228), 'rndag'].join('')].join(' ');
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  function sceneHtml(sceneId) {
    if (sceneId === 'routine') {
      return [
        '<div class="ohf-mock">',
        '  <div class="ohf-parent-chip">👤 Föräldravyn</div>',
        '  <div class="ohf-mock-header">Dagens rutin</div>',
        '  <div class="ohf-activity-row" data-ohf-row="0"><span class="ohf-emoji">👕</span> Klä på sig <span class="ohf-check">✓</span></div>',
        '  <div class="ohf-activity-row" data-ohf-row="1"><span class="ohf-emoji">🪥</span> Borsta tänderna <span class="ohf-check">✓</span></div>',
        '  <div class="ohf-activity-row" data-ohf-row="2"><span class="ohf-emoji">🎒</span> Packa väskan <span class="ohf-check">✓</span></div>',
        '</div>',
      ].join('');
    }
    if (sceneId === 'handoff') {
      return '<div class="ohf-btn-mock" id="ohfHandoffBtn">👶 Testa barnläget</div>';
    }
    if (sceneId === 'child') {
      return [
        '<div class="ohf-mock ohf-child-card">',
        '  <div class="ohf-child-label">Nu</div>',
        '  <div class="ohf-child-emoji">🪥</div>',
        '  <div class="ohf-child-title">Borsta tänderna</div>',
        '  <div class="ohf-child-action" id="ohfChildTap">Markera klar ✓</div>',
        '</div>',
      ].join('');
    }
    if (sceneId === 'done') {
      return [
        '<div class="ohf-mock ohf-child-card ohf-done-card">',
        '  <div class="ohf-done-emoji">✅</div>',
        '  <div class="ohf-done-text">Bra jobbat!</div>',
        '</div>',
      ].join('');
    }
    return [
      '<div class="ohf-star-wrap">',
      '  <div class="ohf-star-glow" aria-hidden="true"></div>',
      '  <div class="ohf-star-burst">⭐</div>',
      '  <div class="ohf-star-trail"><span>⭐</span><span>⭐</span><span>⭐</span></div>',
      '</div>',
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
    } catch {}
    window.location.href = '/dashboard';
  }

  /**
   * @param {{ onFallback?: function, preview?: boolean }} [opts]
   * @returns {Promise<'film'|'fallback'|'skip'>}
   */
  function showHandoffFilm(opts) {
    opts = opts || {};
    const isPreview = Boolean(opts.preview);
    if (!isPreview && (shownThisSession || !isFilmEnabled())) {
      if (opts.onFallback) opts.onFallback();
      return Promise.resolve('fallback');
    }
    if (!isPreview) shownThisSession = true;

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
      '  <div class="ohf-brand-bar">',
      '    <div class="ohf-brand-logo" aria-hidden="true">⭐</div>',
      '    <span class="ohf-brand-name">' + esc(brandLabel()) + '</span>',
      '  </div>',
      isPreview ? '<p class="ohf-preview-banner" role="status">Förhandsvisning — text och animation</p>' : '',
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

    trackEvent(isPreview ? 'onboarding_handoff_film_preview_shown' : 'onboarding_handoff_film_shown', {
      child_id: childId(),
      reduced_motion: reduced,
      preview: isPreview,
    });

    const captionEl = overlay.querySelector('#ohfCaption');
    const ctaPanel = overlay.querySelector('#ohfCtaPanel');
    const sceneEls = overlay.querySelectorAll('.ohf-scene');
    const dotEls = overlay.querySelectorAll('.ohf-dot');

    function teardown() {
      overlay.remove();
    }

    function showCta() {
      ctaPanel.classList.add('is-visible');
      captionEl.textContent = '';
    }

    overlay.querySelector('#ohfTryChildBtn').addEventListener('click', function () {
      trackEvent(isPreview ? 'onboarding_handoff_film_preview_cta_try' : 'onboarding_handoff_film_cta_try', {
        child_id: childId(),
        preview: isPreview,
      });
      teardown();
      if (isPreview) {
        window.location.href = '/child-login';
        return;
      }
      openChildLogin();
    });

    overlay.querySelector('#ohfLaterBtn').addEventListener('click', function () {
      trackEvent(isPreview ? 'onboarding_handoff_film_preview_cta_later' : 'onboarding_handoff_film_cta_later', {
        child_id: childId(),
        preview: isPreview,
      });
      teardown();
      if (isPreview) {
        showHandoffFilm({ preview: true });
        return;
      }
      completeOnboardingAndGoHome();
    });

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

    if (reduced) {
      activateScene(0);
      showCta();
      return Promise.resolve('film');
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
  async function goToHandoffAfterSchema() {
    const oa = act();
    if (oa && typeof oa.loadConfig === 'function') {
      try {
        await oa.loadConfig();
      } catch {}
    }
    maybeShowInsteadOfHandoffStep(function () {
      if (typeof goToStep === 'function') goToStep(5);
    });
  }

  function showPreview() {
    return showHandoffFilm({ preview: true });
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
    showPreview: showPreview,
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
