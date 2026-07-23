/**
 * onboarding-handoff-film.js — ACT-1 handoff film after schema save.
 * On-screen text only (no voiceover, no music). Drives parent to child login.
 */
(function () {
  'use strict';

  const SCENE_IDS = ['routine', 'handoff', 'child', 'done', 'star'];
  const SCENE_DURATIONS = {
    routine: 3000,
    handoff: 4000,
    child: 4000,
    done: 4000,
    star: 4000,
  };

  function ot(key, params) {
    return window.ot ? window.ot(key, params) : key;
  }

  function getScenes() {
    return SCENE_IDS.map(function (id) {
      return {
        id,
        caption: ot('onboarding.handoffFilm.scenes.' + id),
        durationMs: SCENE_DURATIONS[id],
      };
    });
  }

  let shownThisSession = false;
  /** @type {{ timerId?: ReturnType<typeof setInterval>, timeoutIds: number[], overlay?: HTMLElement, isPreview?: boolean } | null} */
  let activeSession = null;

  function destroyActiveSession() {
    if (!activeSession) return;
    if (activeSession.timerId) clearInterval(activeSession.timerId);
    activeSession.timeoutIds.forEach(function (id) { clearTimeout(id); });
    if (activeSession.overlay && activeSession.overlay.parentNode) {
      activeSession.overlay.parentNode.removeChild(activeSession.overlay);
    }
    activeSession = null;
  }

  function scheduleSceneTimeout(fn, ms) {
    const id = setTimeout(fn, ms);
    if (activeSession) activeSession.timeoutIds.push(id);
    return id;
  }

  function act() {
    return window.OnboardingActivation || null;
  }

  function trackEvent(eventType, metadata) {
    const meta = Object.assign({}, activationMeta(), metadata || {});
    const oa = act();
    if (oa && typeof oa.trackEvent === 'function') {
      oa.trackEvent(eventType, meta);
    } else if (window.apiFetch) {
      window.apiFetch('/api/analytics/event', {
        method: 'POST',
        body: JSON.stringify({ event_type: eventType, metadata: meta }),
      }).catch(function () {});
    }
  }

  function activationMeta() {
    const oa = act();
    const cfg = oa && typeof oa.getConfig === 'function' ? oa.getConfig() : null;
    return {
      activation_variant: (cfg && cfg.activation_variant) || 'legacy',
      entry_point: window.__onboardingHandoffEntry || 'unknown',
      child_id: childId(),
      device_context: 'same_device',
    };
  }

  function activationState() {
    const oa = act();
    if (!oa || typeof oa.getConfig !== 'function') return {};
    const cfg = oa.getConfig();
    return (cfg && cfg.state) || {};
  }

  function isAddChildFlow() {
    return typeof window.IS_ADD_CHILD !== 'undefined' && window.IS_ADD_CHILD;
  }

  function isFilmFlagOn() {
    const oa = act();
    if (!oa || typeof oa.getConfig !== 'function') return false;
    const cfg = oa.getConfig();
    return Boolean(cfg && cfg.flags && cfg.flags.activation_onboarding_handoff_film_v1);
  }

  /**
   * @param {{ afterSchemaSave?: boolean }} [opts]
   */
  function isFilmEnabled(opts) {
    opts = opts || {};
    if (!isFilmFlagOn()) return false;

    const cid = childId();
    if (isAddChildFlow()) {
      if (!cid) return false;
      return window.__handoffFilmSeenForChild !== cid;
    }

    const st = activationState();
    if (st.handoff_film_completed_at) return false;
    if (st.child_access_completed_at) return false;

    if (opts.afterSchemaSave) {
      return Boolean(cid);
    }

    if (!st.schema_saved_at) return false;
    return true;
  }

  function markFilmSeen() {
    const cid = childId();
    if (isAddChildFlow()) {
      window.__handoffFilmSeenForChild = cid;
      return;
    }
    const oa = act();
    if (oa && typeof oa.loadConfig === 'function') {
      const cfg = oa.getConfig();
      if (cfg && cfg.state) {
        cfg.state.handoff_film_completed_at = cfg.state.handoff_film_completed_at || new Date().toISOString();
      }
    }
    if (window.apiFetch) {
      window.apiFetch('/api/family/activation/handoff-film-seen', { method: 'POST' }).catch(function () {});
    }
  }

  function childId() {
    const oa = act();
    return oa && typeof oa.getChildId === 'function' ? oa.getChildId() : null;
  }

  function esc(s) {
    return window.escapeHtml ? window.escapeHtml(s) : String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function brandLabel() {
    return ot('onboarding.common.brand');
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
        '  <div class="ohf-parent-chip">👤 ' + esc(ot('onboarding.handoffFilm.mock.parentView')) + '</div>',
        '  <div class="ohf-mock-header">' + esc(ot('onboarding.handoffFilm.mock.dailyRoutine')) + '</div>',
        '  <div class="ohf-activity-row" data-ohf-row="0"><span class="ohf-emoji">👕</span> ' + esc(ot('onboarding.handoffFilm.mock.dress')) + ' <span class="ohf-check">✓</span></div>',
        '  <div class="ohf-activity-row" data-ohf-row="1"><span class="ohf-emoji">🪥</span> ' + esc(ot('onboarding.handoffFilm.mock.brushTeeth')) + ' <span class="ohf-check">✓</span></div>',
        '  <div class="ohf-activity-row" data-ohf-row="2"><span class="ohf-emoji">🎒</span> ' + esc(ot('onboarding.handoffFilm.mock.packBag')) + ' <span class="ohf-check">✓</span></div>',
        '</div>',
      ].join('');
    }
    if (sceneId === 'handoff') {
      return '<div class="ohf-btn-mock" id="ohfHandoffBtn">' + esc(ot('onboarding.handoffFilm.mock.tryChildMode')) + '</div>';
    }
    if (sceneId === 'child') {
      return [
        '<div class="ohf-mock ohf-child-card">',
        '  <div class="ohf-child-label">' + esc(ot('onboarding.handoffFilm.mock.now')) + '</div>',
        '  <div class="ohf-child-emoji">🪥</div>',
        '  <div class="ohf-child-title">' + esc(ot('onboarding.handoffFilm.mock.brushTeeth')) + '</div>',
        '  <div class="ohf-child-action" id="ohfChildTap">' + esc(ot('onboarding.handoffFilm.mock.markDone')) + '</div>',
        '</div>',
      ].join('');
    }
    if (sceneId === 'done') {
      return [
        '<div class="ohf-mock ohf-child-card ohf-done-card">',
        '  <div class="ohf-done-emoji">✅</div>',
        '  <div class="ohf-done-text">' + esc(ot('onboarding.handoffFilm.mock.wellDone')) + '</div>',
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

  function resetSceneFx(root) {
    root.querySelectorAll('.is-done, .is-pressed, .is-tapped').forEach(function (el) {
      el.classList.remove('is-done', 'is-pressed', 'is-tapped');
    });
    root.querySelectorAll('.ohf-star-burst, .ohf-star-trail span').forEach(function (el) {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
  }

  function runSceneFx(sceneId, root) {
    if (sceneId === 'routine') {
      const rows = root.querySelectorAll('[data-ohf-row]');
      rows.forEach(function (row, i) {
        scheduleSceneTimeout(function () { row.classList.add('is-done'); }, 400 + i * 500);
      });
    }
    if (sceneId === 'handoff') {
      const btn = root.querySelector('#ohfHandoffBtn');
      if (btn) scheduleSceneTimeout(function () { btn.classList.add('is-pressed'); }, 1200);
    }
    if (sceneId === 'child') {
      const tap = root.querySelector('#ohfChildTap');
      if (tap) scheduleSceneTimeout(function () { tap.classList.add('is-tapped'); }, 1400);
    }
  }

  function getHandoffLoginInfo() {
    if (typeof populateStep5LoginInfo === 'function') populateStep5LoginInfo();
    const nameEl = document.getElementById('s5ChildName');
    const userEl = document.getElementById('s5Username');
    const pinEl = document.getElementById('s5Pin');
    return {
      name: nameEl ? nameEl.textContent.trim() : ot('onboarding.common.childFallback'),
      username: userEl ? userEl.textContent.trim() : '',
      pin: pinEl ? pinEl.textContent.trim() : '',
    };
  }

  function openChildLogin() {
    trackEvent('onboarding_handoff_opened', { source: 'film_handoff_panel' });
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

  function postponeHandoff() {
    markFilmSeen();
    window.location.href = '/dashboard?next_step=child_handoff';
  }

  function showHandoffPanel(overlay, ctaPanel) {
    const info = getHandoffLoginInfo();
    markFilmSeen();
    trackEvent('onboarding_handoff_opened', { source: 'film_cta_try' });

    ctaPanel.innerHTML = [
      '<h2 class="ohf-cta-title">' + esc(ot('onboarding.handoffFilm.loginTitle')) + '</h2>',
      '<p class="ohf-handoff-lead">' + esc(ot('onboarding.handoffFilm.loginLead', { childName: info.name })) + '</p>',
      '<div class="ohf-handoff-credentials">',
      '  <p class="ohf-handoff-row"><span class="ohf-handoff-label">' + esc(ot('onboarding.handoffFilm.usernameLabel')) + '</span>',
      '  <strong class="ohf-handoff-value" id="ohfHandoffUsername">' + esc(info.username) + '</strong></p>',
      '  <p class="ohf-handoff-row"><span class="ohf-handoff-label">' + esc(ot('onboarding.handoffFilm.pinLabel')) + '</span>',
      '  <strong class="ohf-handoff-pin" id="ohfHandoffPin">' + esc(info.pin) + '</strong></p>',
      '</div>',
      '<p class="ohf-handoff-hint">' + esc(ot('onboarding.handoffFilm.loginHint')) + '</p>',
      '<button type="button" class="ohf-cta-secondary ohf-copy-btn" id="ohfCopyLoginBtn">' + esc(ot('onboarding.handoffFilm.copyLogin')) + '</button>',
      '<button type="button" class="ohf-cta-primary" id="ohfOpenChildBtn">' + esc(ot('onboarding.handoffFilm.openChildMode')) + '</button>',
    ].join('');

    ctaPanel.classList.add('is-visible');
    overlay.querySelector('#ohfCaption').textContent = '';

    const copyBtn = ctaPanel.querySelector('#ohfCopyLoginBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        const login = getHandoffLoginInfo();
        const text = ot('onboarding.handoffFilm.copyText', {
          childName: login.name,
          username: login.username,
          pin: login.pin,
        });
        const done = function () {
          copyBtn.textContent = ot('onboarding.handoffFilm.copied');
          setTimeout(function () { copyBtn.textContent = ot('onboarding.handoffFilm.copyLogin'); }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () { alert(text); });
        } else {
          alert(text);
        }
      });
    }
    ctaPanel.querySelector('#ohfOpenChildBtn').addEventListener('click', function () {
      overlay.remove();
      openChildLogin();
    });
  }

  /**
   * @param {{ onFallback?: function, preview?: boolean }} [opts]
   * @returns {Promise<'film'|'fallback'|'skip'>}
   */
  function showHandoffFilm(opts) {
    opts = opts || {};
    const SCENES = getScenes();
    const TOTAL_MS = SCENES.reduce(function (sum, s) { return sum + s.durationMs; }, 0);
    const isPreview = Boolean(opts.preview);
    if (!isPreview && (shownThisSession || !isFilmEnabled())) {
      if (opts.onFallback) opts.onFallback();
      return Promise.resolve('fallback');
    }
    if (!isPreview) shownThisSession = true;

    destroyActiveSession();

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
      '  <div class="ohf-stage" id="ohfStage">',
      scenesHtml,
      '  </div>',
      '  <p class="ohf-caption" id="ohfCaption">' + esc(SCENES[0].caption) + '</p>',
      '  <div class="ohf-progress" aria-hidden="true">' + dotsHtml + '</div>',
      '  <div class="ohf-cta-panel' + (reduced ? ' is-visible' : '') + '" id="ohfCtaPanel">',
      '    <h2 class="ohf-cta-title">' + esc(ot('onboarding.handoffFilm.ctaReady')) + '</h2>',
      '    <button type="button" class="ohf-cta-primary" id="ohfTryChildBtn">' + esc(ot('onboarding.handoffFilm.ctaTryNow')) + '</button>',
      '    <button type="button" class="ohf-cta-secondary" id="ohfLaterBtn">' + esc(ot('onboarding.handoffFilm.ctaLater')) + '</button>',
      '  </div>',
      '</div>',
    ].join('');

    document.body.appendChild(overlay);

    activeSession = {
      overlay: overlay,
      timeoutIds: [],
      isPreview: isPreview,
    };

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
      destroyActiveSession();
    }

    function showCta() {
      if (!isPreview) markFilmSeen();
      ctaPanel.classList.add('is-visible');
      captionEl.textContent = '';
    }

    overlay.querySelector('#ohfTryChildBtn').addEventListener('click', function () {
      trackEvent(isPreview ? 'onboarding_handoff_film_preview_cta_try' : 'onboarding_handoff_film_cta_try', {
        preview: isPreview,
      });
      if (isPreview) {
        teardown();
        window.location.href = '/child-login';
        return;
      }
      showHandoffPanel(overlay, ctaPanel);
    });

    overlay.querySelector('#ohfLaterBtn').addEventListener('click', function () {
      trackEvent(isPreview ? 'onboarding_handoff_film_preview_cta_later' : 'onboarding_handoff_film_cta_later', {
        preview: isPreview,
      });
      teardown();
      if (isPreview) {
        showHandoffFilm({ preview: true });
        return;
      }
      postponeHandoff();
    });

    let idx = 0;
    let elapsed = 0;

    function activateScene(i) {
      sceneEls.forEach(function (el, j) {
        const on = j === i;
        el.classList.toggle('is-active', on);
        el.setAttribute('aria-hidden', on ? 'false' : 'true');
        if (!on) resetSceneFx(el);
      });
      dotEls.forEach(function (el, j) {
        el.classList.toggle('is-active', j === i);
      });
      captionEl.textContent = SCENES[i].caption;
      resetSceneFx(sceneEls[i]);
      runSceneFx(SCENES[i].id, sceneEls[i]);
    }

    if (reduced) {
      activateScene(0);
      showCta();
      return Promise.resolve('film');
    }

    activateScene(0);

    const timer = setInterval(function () {
      if (!activeSession || activeSession.overlay !== overlay) {
        clearInterval(timer);
        return;
      }
      elapsed += 200;
      const scene = SCENES[idx];
      if (elapsed >= scene.durationMs) {
        elapsed = 0;
        idx += 1;
        if (idx >= SCENES.length) {
          clearInterval(timer);
          if (activeSession) activeSession.timerId = undefined;
          showCta();
          trackEvent('onboarding_handoff_film_complete', { child_id: childId(), duration_ms: TOTAL_MS });
          return;
        }
        activateScene(idx);
      }
    }, 200);
    activeSession.timerId = timer;

    return Promise.resolve('film');
  }

  function maybeShowInsteadOfHandoffStep(fallback, opts) {
    if (!isFilmEnabled(opts)) {
      if (typeof fallback === 'function') fallback();
      return;
    }
    if (typeof populateStep5LoginInfo === 'function') populateStep5LoginInfo();
    showHandoffFilm();
  }

  async function goToHandoffAfterSchema(entryPoint) {
    window.__onboardingHandoffEntry = entryPoint || 'schema_saved';
    const oa = act();
    if (oa && typeof oa.loadConfig === 'function') {
      try {
        await oa.loadConfig();
      } catch {}
    }
    maybeShowInsteadOfHandoffStep(function () {
      if (typeof populateStep5LoginInfo === 'function') populateStep5LoginInfo();
      if (typeof goToStep === 'function') goToStep(5);
    }, { afterSchemaSave: true });
  }

  function showPreview() {
    return showHandoffFilm({ preview: true });
  }

  function init() {
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
