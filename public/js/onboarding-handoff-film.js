/**
 * onboarding-handoff-film.js — ACT-1 handoff film after schema save.
 * Emotional bridge: evening planning → tomorrow's first shared use.
 * On-screen text + subtle SFX (no voiceover, no music).
 */
(function () {
  'use strict';

  const FILM_VERSION = '1.5.0';
  const TICK_MS = 200;

  let shownThisSession = false;

  /** @type {ReturnType<typeof createSfx>|null} */
  let sfx = null;

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
      film_version: FILM_VERSION,
    };
  }

  function activationState() {
    const oa = act();
    if (!oa || typeof oa.getConfig !== 'function') return {};
    const cfg = oa.getConfig();
    return (cfg && cfg.state) || {};
  }

  function isFilmEnabled() {
    if (typeof window.IS_ADD_CHILD !== 'undefined' && window.IS_ADD_CHILD) return false;
    const oa = act();
    if (!oa || typeof oa.getConfig !== 'function') return false;
    const cfg = oa.getConfig();
    if (!cfg || !cfg.flags || !cfg.flags.activation_onboarding_handoff_film_v1) return false;
    const st = activationState();
    if (!st.schema_saved_at) return false;
    if (st.child_access_completed_at) return false;
    if (st.handoff_film_completed_at) return false;
    return true;
  }

  function markFilmSeen() {
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

  function getHandoffLoginInfo() {
    if (typeof populateStep5LoginInfo === 'function') populateStep5LoginInfo();
    const nameEl = document.getElementById('s5ChildName');
    const userEl = document.getElementById('s5Username');
    const pinEl = document.getElementById('s5Pin');
    return {
      name: nameEl ? nameEl.textContent.trim() : 'Barnet',
      username: userEl ? userEl.textContent.trim() : '',
      pin: pinEl ? pinEl.textContent.trim() : '',
    };
  }

  function childDisplayName() {
    const name = getHandoffLoginInfo().name;
    return name && name !== 'Barnet' ? name : 'barnet';
  }

  function childPossessive() {
    const name = getHandoffLoginInfo().name;
    if (!name || name === 'Barnet') return 'barnets';
    const trimmed = name.trim();
    if (/[sS]$/.test(trimmed)) return trimmed + ' ';
    return trimmed + 's';
  }

  function buildScenes() {
    const possessive = childPossessive();
    const display = childDisplayName();
    return [
      { id: 'together', caption: '', durationMs: 2500, emotional: true },
      { id: 'why', caption: 'I morgon gör ni det här tillsammans.', durationMs: 3200, emotional: true },
      { id: 'routine', caption: 'Rutinen är klar', durationMs: 2800 },
      { id: 'child', caption: 'Barnet markerar klart', durationMs: 3200 },
      { id: 'star_burst', caption: '', durationMs: 1400 },
      { id: 'star_personal', caption: 'Det där var ' + possessive + 'första stjärna.', durationMs: 2800, emotional: true },
      { id: 'star_turn', caption: 'Nu är det er tur.', durationMs: 2200, emotional: true },
      { id: 'tomorrow', caption: 'Imorgon väntar ' + possessive + 'första stjärna ⭐', durationMs: 2400, emotional: true },
    ];
  }

  function createSfx() {
    let ctx = null;
    let muted = false;

    function audioCtx() {
      if (muted) return null;
      try {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
      } catch {
        return null;
      }
    }

    function tone(freq, duration, type, vol, delay) {
      const ac = audioCtx();
      if (!ac) return;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ac.destination);
      const t = ac.currentTime + (delay || 0);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol || 0.08, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    }

    return {
      setMuted: function (m) { muted = m; },
      check: function () {
        tone(1047, 0.1, 'sine', 0.09, 0);
        tone(1319, 0.14, 'sine', 0.07, 0.06);
      },
      star: function () {
        [784, 988, 1175, 1568].forEach(function (f, i) {
          tone(f, 0.22, 'sine', 0.085, i * 0.07);
        });
      },
      whoosh: function () {
        const ac = audioCtx();
        if (!ac) return;
        const len = ac.sampleRate * 0.18;
        const buffer = ac.createBuffer(1, len, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ac.createBufferSource();
        const gain = ac.createGain();
        const filter = ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        src.buffer = buffer;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(ac.destination);
        const t = ac.currentTime;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        src.start(t);
      },
      click: function () {
        tone(380, 0.045, 'triangle', 0.05, 0);
      },
    };
  }

  function sceneHtml(sceneId, childName) {
    if (sceneId === 'together') {
      return [
        '<div class="ohf-human-scene">',
        '  <video class="ohf-human-video" muted playsinline preload="metadata" poster="/onboarding/handoff-film-open-poster.jpg">',
        '    <source src="/onboarding/handoff-film-open.mp4" type="video/mp4">',
        '  </video>',
        '  <div class="ohf-human-fallback" aria-hidden="true">',
        '    <div class="ohf-human-glow"></div>',
        '    <div class="ohf-human-sofa"></div>',
        '    <div class="ohf-human-figures">',
        '      <div class="ohf-figure ohf-figure-parent"><span class="ohf-figure-head"></span><span class="ohf-figure-body"></span></div>',
        '      <div class="ohf-figure ohf-figure-child"><span class="ohf-figure-head"></span><span class="ohf-figure-body"></span></div>',
        '    </div>',
        '    <p class="ohf-human-caption">Tillsammans på kvällen</p>',
        '  </div>',
        '</div>',
      ].join('');
    }
    if (sceneId === 'why' || sceneId === 'tomorrow') {
      return '<div class="ohf-emotional-card" aria-hidden="true"><div class="ohf-emotional-icon">🌙</div></div>';
    }
    if (sceneId === 'routine') {
      return [
        '<div class="ohf-mock">',
        '  <div class="ohf-parent-chip">👤 Föräldravyn</div>',
        '  <div class="ohf-mock-header">Morgonrutin för ' + esc(childName) + '</div>',
        '  <div class="ohf-activity-row is-done" data-ohf-row="0"><span class="ohf-emoji">👕</span> Klä på sig <span class="ohf-check">✓</span></div>',
        '  <div class="ohf-activity-row" data-ohf-row="1"><span class="ohf-emoji">🪥</span> Borsta tänderna <span class="ohf-check">✓</span></div>',
        '  <div class="ohf-activity-row" data-ohf-row="2"><span class="ohf-emoji">🎒</span> Packa väskan <span class="ohf-check">✓</span></div>',
        '</div>',
      ].join('');
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
    if (sceneId === 'star_burst' || sceneId === 'star_personal' || sceneId === 'star_turn') {
      const hero = sceneId === 'star_burst' ? ' ohf-star-wrap--hero' : '';
      return [
        '<div class="ohf-star-wrap' + hero + '">',
        '  <div class="ohf-star-glow" aria-hidden="true"></div>',
        '  <div class="ohf-star-burst">⭐</div>',
        sceneId === 'star_burst' ? '<div class="ohf-star-trail"><span>⭐</span><span>⭐</span><span>⭐</span></div>' : '',
        '</div>',
      ].join('');
    }
    return '';
  }

  function runSceneFx(sceneId, root, sceneIndex) {
    if (sceneIndex > 0 && sfx) sfx.whoosh();

    if (sceneId === 'together') {
      const video = root.querySelector('.ohf-human-video');
      const fallback = root.querySelector('.ohf-human-fallback');
      if (video) {
        video.addEventListener('error', function () {
          if (fallback) fallback.classList.add('is-visible');
        });
        video.addEventListener('loadeddata', function () {
          if (fallback) fallback.classList.remove('is-visible');
          video.classList.add('is-playing');
          video.play().catch(function () {
            if (fallback) fallback.classList.add('is-visible');
          });
        });
        if (video.readyState >= 2) {
          video.classList.add('is-playing');
          video.play().catch(function () {
            if (fallback) fallback.classList.add('is-visible');
          });
        } else if (fallback) {
          fallback.classList.add('is-visible');
        }
      } else if (fallback) {
        fallback.classList.add('is-visible');
      }
    }

    if (sceneId === 'routine') {
      const row = root.querySelector('[data-ohf-row="1"]');
      if (row) {
        setTimeout(function () {
          row.classList.add('is-done');
          if (sfx) sfx.check();
        }, 900);
      }
    }

    if (sceneId === 'child') {
      const tap = root.querySelector('#ohfChildTap');
      if (tap) {
        setTimeout(function () {
          tap.classList.add('is-tapped');
          if (sfx) sfx.check();
        }, 1200);
      }
    }

    if (sceneId === 'star_burst' && sfx) {
      setTimeout(function () { sfx.star(); }, 200);
    }
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
      '<h2 class="ohf-cta-title">Ni provar tillsammans nu</h2>',
      '<p class="ohf-handoff-lead"><strong>' + esc(info.name) + '</strong> loggar in med namn och PIN.</p>',
      '<div class="ohf-handoff-credentials">',
      '  <p class="ohf-handoff-row"><span class="ohf-handoff-label">Användarnamn</span>',
      '  <strong class="ohf-handoff-value" id="ohfHandoffUsername">' + esc(info.username) + '</strong></p>',
      '  <p class="ohf-handoff-row"><span class="ohf-handoff-label">PIN-kod</span>',
      '  <strong class="ohf-handoff-pin" id="ohfHandoffPin">' + esc(info.pin) + '</strong></p>',
      '</div>',
      '<p class="ohf-handoff-hint">Sätt er bredvid varandra — samma eller annan enhet fungerar.</p>',
      '<button type="button" class="ohf-cta-secondary ohf-copy-btn" id="ohfCopyLoginBtn">📋 Kopiera inloggning</button>',
      '<button type="button" class="ohf-cta-primary" id="ohfOpenChildBtn">Börja tillsammans</button>',
    ].join('');

    ctaPanel.classList.add('is-visible');
    overlay.querySelector('#ohfCaption').textContent = '';
    overlay.querySelector('#ohfCaption').classList.remove('ohf-caption--emotional');

    const copyBtn = ctaPanel.querySelector('#ohfCopyLoginBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        if (sfx) sfx.click();
        const login = getHandoffLoginInfo();
        const text = login.name + '\nAnvändarnamn: ' + login.username + '\nPIN: ' + login.pin;
        const done = function () {
          copyBtn.textContent = '✓ Kopierat!';
          setTimeout(function () { copyBtn.textContent = '📋 Kopiera inloggning'; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () { alert(text); });
        } else {
          alert(text);
        }
      });
    }
    ctaPanel.querySelector('#ohfOpenChildBtn').addEventListener('click', function () {
      if (sfx) sfx.click();
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
    const isPreview = Boolean(opts.preview);
    if (!isPreview && (shownThisSession || !isFilmEnabled())) {
      if (opts.onFallback) opts.onFallback();
      return Promise.resolve('fallback');
    }
    if (!isPreview) shownThisSession = true;

    const reduced = prefersReducedMotion();
    const scenes = buildScenes();
    const totalMs = scenes.reduce(function (sum, s) { return sum + s.durationMs; }, 0);
    const childName = childDisplayName();

    sfx = createSfx();
    sfx.setMuted(reduced);

    const overlay = document.createElement('div');
    overlay.id = 'onboardingHandoffFilm';
    overlay.className = 'ohf-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'ohfCaption');

    const scenesHtml = scenes.map(function (scene, i) {
      return [
        '<div class="ohf-scene' + (i === 0 && !reduced ? ' is-active' : '') + '" data-scene="' + scene.id + '">',
        sceneHtml(scene.id, childName),
        '</div>',
      ].join('');
    }).join('');

    const dotsHtml = scenes.map(function (_, i) {
      return '<span class="ohf-dot' + (i === 0 ? ' is-active' : '') + '" data-dot="' + i + '"></span>';
    }).join('');

    const ctaTitle = 'Redo?';
    const ctaSub = 'Imorgon gör ni första morgonen tillsammans.';

    overlay.innerHTML = [
      '<div class="ohf-card">',
      '  <div class="ohf-brand-bar">',
      '    <div class="ohf-brand-logo" aria-hidden="true">⭐</div>',
      '    <span class="ohf-brand-name">' + esc(brandLabel()) + '</span>',
      '  </div>',
      isPreview ? '<p class="ohf-preview-banner" role="status">Förhandsvisning — text, animation och ljud</p>' : '',
      '  <div class="ohf-stage" id="ohfStage">',
      scenesHtml,
      '  </div>',
      '  <p class="ohf-caption" id="ohfCaption">' + esc(scenes[0].caption) + '</p>',
      '  <div class="ohf-progress" aria-hidden="true">' + dotsHtml + '</div>',
      '  <div class="ohf-cta-panel' + (reduced ? ' is-visible' : '') + '" id="ohfCtaPanel">',
      '    <h2 class="ohf-cta-title">' + esc(ctaTitle) + '</h2>',
      '    <p class="ohf-cta-sub" id="ohfCtaSub">' + esc(ctaSub) + '</p>',
      '    <button type="button" class="ohf-cta-primary" id="ohfTryChildBtn">Börja tillsammans</button>',
      '    <button type="button" class="ohf-cta-secondary" id="ohfLaterBtn">Gör det senare</button>',
      '  </div>',
      '</div>',
    ].join('');

    document.body.appendChild(overlay);

    trackEvent(isPreview ? 'onboarding_handoff_film_preview_shown' : 'onboarding_handoff_film_shown', {
      child_id: childId(),
      reduced_motion: reduced,
      preview: isPreview,
      film_version: FILM_VERSION,
    });

    const captionEl = overlay.querySelector('#ohfCaption');
    const ctaPanel = overlay.querySelector('#ohfCtaPanel');
    const sceneEls = overlay.querySelectorAll('.ohf-scene');
    const dotEls = overlay.querySelectorAll('.ohf-dot');

    function teardown() {
      overlay.remove();
      sfx = null;
    }

    function showCta() {
      markFilmSeen();
      ctaPanel.classList.add('is-visible');
      captionEl.textContent = '';
      captionEl.classList.remove('ohf-caption--emotional');
    }

    overlay.querySelector('#ohfTryChildBtn').addEventListener('click', function () {
      if (sfx) sfx.click();
      trackEvent(isPreview ? 'onboarding_handoff_film_preview_cta_try' : 'onboarding_handoff_film_cta_try', {
        preview: isPreview,
        film_version: FILM_VERSION,
      });
      if (isPreview) {
        teardown();
        window.location.href = '/child-login';
        return;
      }
      showHandoffPanel(overlay, ctaPanel);
    });

    overlay.querySelector('#ohfLaterBtn').addEventListener('click', function () {
      if (sfx) sfx.click();
      trackEvent(isPreview ? 'onboarding_handoff_film_preview_cta_later' : 'onboarding_handoff_film_cta_later', {
        preview: isPreview,
        film_version: FILM_VERSION,
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
      const scene = scenes[i];
      sceneEls.forEach(function (el, j) {
        el.classList.toggle('is-active', j === i);
      });
      dotEls.forEach(function (el, j) {
        el.classList.toggle('is-active', j === i);
      });
      captionEl.textContent = scene.caption;
      captionEl.classList.toggle('ohf-caption--emotional', Boolean(scene.emotional));
      runSceneFx(scene.id, sceneEls[i], i);
    }

    if (reduced) {
      activateScene(scenes.length - 1);
      captionEl.textContent = scenes[scenes.length - 1].caption;
      showCta();
      return Promise.resolve('film');
    }

    activateScene(0);

    const timer = setInterval(function () {
      elapsed += TICK_MS;
      const scene = scenes[idx];
      if (elapsed >= scene.durationMs) {
        elapsed = 0;
        idx += 1;
        if (idx >= scenes.length) {
          clearInterval(timer);
          showCta();
          trackEvent('onboarding_handoff_film_complete', {
            child_id: childId(),
            duration_ms: totalMs,
            film_version: FILM_VERSION,
          });
          return;
        }
        activateScene(idx);
      }
    }, TICK_MS);

    return Promise.resolve('film');
  }

  function maybeShowInsteadOfHandoffStep(fallback) {
    if (!isFilmEnabled()) {
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
    FILM_VERSION: FILM_VERSION,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
