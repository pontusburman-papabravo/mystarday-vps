/**
 * child-garden.js — Trädgården illustrated asset scene (presentation only).
 * Primary visual: scene-bg.webp via <picture>. CSS = layout + animation only.
 */
(function () {
  'use strict';

  const API_PATH = '/api/me/garden';
  const VERB_PATH = '/api/me/garden/verb';
  const FETCH_TIMEOUT_MS = 8000;
  const TAP_RESET_MS = 1200;

  function findLivingSlot(state, sceneryId) {
    if (!state || !sceneryId) return null;
    const scenery = (state.scenery || []).find(function (s) { return s.scenery_id === sceneryId; });
    const slotId = scenery && scenery.living_slot_id;
    if (!slotId) return null;
    return (state.living_slots || []).find(function (s) { return s.slot_id === slotId; }) || null;
  }

  function clearTimerRefresh() {
    if (_timerRefresh) {
      clearTimeout(_timerRefresh);
      _timerRefresh = null;
    }
  }

  function livingSlotTransitionMessage(prevState, nextState) {
    const prevSlots = (prevState && prevState.living_slots) || [];
    const nextSlots = (nextState && nextState.living_slots) || [];
    for (const slot of nextSlots) {
      const prev = prevSlots.find(function (s) { return s.slot_id === slot.slot_id; });
      if (prev && prev.state_key !== slot.state_key && slot.label_state_sv) {
        return slot.label_state_sv;
      }
    }
    return null;
  }

  function scheduleTimerRefresh(state) {
    clearTimerRefresh();
    if (!state || !_active) return;
    let minMs = null;
    (state.living_slots || []).forEach(function (slot) {
      if (slot.timer_remaining_ms != null && slot.timer_remaining_ms > 0) {
        if (minMs === null || slot.timer_remaining_ms < minMs) {
          minMs = slot.timer_remaining_ms;
        }
      }
    });
    if (minMs === null) return;
    _timerRefresh = setTimeout(async function () {
      const fresh = await fetchState();
      if (fresh && fresh.enabled) {
        const view = document.getElementById('skattkammarView');
        const announce = livingSlotTransitionMessage(_state, fresh);
        _state = fresh;
        if (view) {
          applyLivingSlotVisuals(view, fresh);
          if (announce) showLoeFeedback(view, announce);
        }
        scheduleTimerRefresh(fresh);
      }
    }, minMs + 200);
  }

  async function postSlotVerb(slot) {
    const verbs = (slot && slot.available_verbs) || [];
    if (!verbs.length || !window.Auth) return null;
    const action = verbs[0];
    if (!action || !action.verb) return null;
    return window.Auth.api(VERB_PATH, {
      method: 'POST',
      body: JSON.stringify({ slot_id: slot.slot_id, verb: action.verb }),
    });
  }

  function visualTokenClass(token) {
    if (!token) return null;
    return 'gd-loe--' + String(token).replace(/[^a-z0-9_-]/gi, '');
  }

  function stripLoeClasses(el) {
    if (!el || !el.classList) return;
    const remove = [];
    el.classList.forEach(function (c) {
      if (c.indexOf('gd-loe--') === 0) remove.push(c);
    });
    remove.forEach(function (c) { el.classList.remove(c); });
  }

  function applyLivingSlotVisuals(root, state) {
    if (!root || !state) return;
    const scene = root.querySelector('.gd-scene-canvas');
    const bedBtn = root.querySelector('.gd-hotspot--bed');
    if (scene) stripLoeClasses(scene);
    if (bedBtn) {
      stripLoeClasses(bedBtn);
      bedBtn.removeAttribute('data-loe-state');
    }

    (state.living_slots || []).forEach(function (slot) {
      const cls = visualTokenClass(slot.visual_token);
      if (!cls) return;
      if (slot.slot_id === 'bed_1') {
        if (bedBtn) {
          bedBtn.classList.add(cls);
          if (slot.state_key) bedBtn.setAttribute('data-loe-state', slot.state_key);
        }
        if (scene) scene.classList.add(cls);
      }
    });
  }

  function showLoeFeedback(root, message) {
    if (!root || !message) return;
    const status = root.querySelector('#gdSceneStatus');
    if (!status) return;
    status.textContent = message;
    setTimeout(function () {
      if (status.textContent === message) status.textContent = '';
    }, TAP_RESET_MS);
  }

  function applySlotVisual(root, slot) {
    applyLivingSlotVisuals(root, { living_slots: slot ? [slot] : [] });
  }

  let _active = false;
  let _state = null;
  let _prefersReducedMotion = false;
  let _assetCleanup = null;
  let _timerRefresh = null;

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function pipeline() {
    return window.GardenAssetPipeline || null;
  }

  function scenePictureMarkup() {
    const p = pipeline();
    if (p && typeof p.scenePictureHtml === 'function') {
      return p.scenePictureHtml();
    }
    return '<picture class="gd-scene-picture" data-asset-id="scene-bg">' +
      '<source type="image/webp" media="(max-width: 430px)" srcset="/images/child/world/garden/scene-bg-430.webp" />' +
      '<source type="image/webp" media="(max-width: 860px)" srcset="/images/child/world/garden/scene-bg-860.webp" />' +
      '<img class="gd-scene-bg" data-asset-id="scene-bg" data-critical="true"' +
        ' src="/images/child/world/garden/scene-bg.webp"' +
        ' srcset="/images/child/world/garden/scene-bg-430.webp 430w, /images/child/world/garden/scene-bg-860.webp 860w, /images/child/world/garden/scene-bg-1280.webp 1280w"' +
        ' sizes="100vw" alt="" decoding="async" loading="eager" fetchpriority="high" />' +
      '</picture>';
  }

  function renderScene(state) {
    const scenery = (state && state.scenery) || [];

    const sceneryHtml = scenery.map(function (s) {
      const id = s.scenery_id;
      const cls = s.hotspot_class || ('gd-hotspot--' + id.replace(/^garden_/, ''));
      if (!id) return '';
      return '<button type="button" class="gd-hotspot ' + cls + '"' +
        ' data-scenery="' + esc(id) + '"' +
        ' aria-label="' + esc(s.label_sv || id) + '"></button>';
    }).join('');

    return '<div class="gd-scene gd-scene--illustrated gd-scene--entering" data-world="garden" role="img" aria-label="Trädgården">' +
      '<div class="gd-scene-canvas" aria-hidden="true">' +
        scenePictureMarkup() +
        '<div class="gd-ambient gd-ambient--clouds" aria-hidden="true"></div>' +
        '<div class="gd-tap-pulse" id="gdTapPulse" aria-hidden="true"></div>' +
      '</div>' +
      sceneryHtml +
      '<div class="gd-scene-status" id="gdSceneStatus" role="status" aria-live="polite" aria-atomic="true"></div>' +
      '<button type="button" class="gd-back-fab" id="gdBackMorgonhus" aria-label="Tillbaka till Morgonhuset">' +
        '<span class="gd-back-icon" aria-hidden="true"></span>' +
      '</button>' +
    '</div>';
  }

  function triggerVisual(root, sceneryId) {
    if (!root) return;
    const pulse = root.querySelector('#gdTapPulse');
    const scene = root.querySelector('.gd-scene-canvas');

    if (pulse) {
      pulse.classList.remove('is-active');
      void pulse.offsetWidth;
      pulse.classList.add('is-active');
      setTimeout(function () { pulse.classList.remove('is-active'); }, TAP_RESET_MS);
    }

    if (sceneryId === 'garden_path' && scene) {
      scene.classList.add('is-path-tap');
      setTimeout(function () { scene.classList.remove('is-path-tap'); }, TAP_RESET_MS);
      return;
    }
    if (sceneryId === 'garden_bed' && scene) {
      scene.classList.add('is-bloom-tap');
      setTimeout(function () { scene.classList.remove('is-bloom-tap'); }, TAP_RESET_MS);
      return;
    }
    if (sceneryId === 'garden_sky' && scene) {
      scene.classList.add('is-sky-tap');
      setTimeout(function () { scene.classList.remove('is-sky-tap'); }, TAP_RESET_MS);
    }
  }

  async function handleSceneryTap(root, sceneryId) {
    const slot = findLivingSlot(_state, sceneryId);
    if (slot && slot.available_verbs && slot.available_verbs.length) {
      try {
        const result = await postSlotVerb(slot);
        if (result && result.slot) {
          const slots = (_state.living_slots || []).map(function (s) {
            return s.slot_id === result.slot.slot_id ? result.slot : s;
          });
          _state = Object.assign({}, _state, { living_slots: slots });
          applyLivingSlotVisuals(root, _state);
          showLoeFeedback(root, result.child_message_sv);
          scheduleTimerRefresh(_state);
          return;
        }
      } catch (err) {
        console.warn('[garden] verb failed:', err && err.message);
      }
    }
    triggerVisual(root, sceneryId);
  }

  function bindInteractions(root) {
    if (!root) return;

    root.querySelectorAll('.gd-hotspot').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-scenery');
        btn.classList.add('is-tapped');
        setTimeout(function () { btn.classList.remove('is-tapped'); }, 280);
        handleSceneryTap(root, id);
      });
    });

    const backBtn = root.querySelector('#gdBackMorgonhus');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        if (window.LivingWorldTransition
            && typeof window.LivingWorldTransition.isActive === 'function'
            && window.LivingWorldTransition.isActive()
            && typeof window.LivingWorldTransition.exitGarden === 'function') {
          window.LivingWorldTransition.exitGarden();
          return;
        }
        exitToMorgonhus();
      });
    }
  }

  function finishEnterAnimation(root) {
    const scene = root && root.querySelector('.gd-scene');
    if (!scene) return;
    if (_prefersReducedMotion) {
      scene.classList.remove('gd-scene--entering');
      return;
    }
    function onEnd() {
      scene.classList.remove('gd-scene--entering');
      scene.removeEventListener('animationend', onEnd);
    }
    scene.addEventListener('animationend', onEnd);
  }

  function bindAssetWatch(root) {
    if (_assetCleanup) {
      _assetCleanup();
      _assetCleanup = null;
    }
    const p = pipeline();
    if (!p || typeof p.watchSceneImage !== 'function') return;
    _assetCleanup = p.watchSceneImage(root, function () {
      console.warn('[garden] scene-bg failed — exiting to Morgonhus');
      if (window.LivingWorldTransition
          && typeof window.LivingWorldTransition.isActive === 'function'
          && window.LivingWorldTransition.isActive()
          && typeof window.LivingWorldTransition.exitGarden === 'function') {
        window.LivingWorldTransition.exitGarden();
        return;
      }
      exitToMorgonhus();
    });
  }

  function hideLoader() {
    const loader = document.getElementById('skattkammarLoading');
    const view = document.getElementById('skattkammarView');
    if (loader) loader.style.display = 'none';
    if (view) view.style.display = '';
  }

  async function fetchState() {
    if (!window.Auth || typeof window.Auth.api !== 'function') return null;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller
      ? setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS)
      : null;

    try {
      const options = controller ? { signal: controller.signal } : {};
      return await window.Auth.api(API_PATH, options);
    } catch (err) {
      if (err && err.name === 'AbortError') {
        console.warn('[garden] fetch timeout');
      } else if (err && err.status === 503) {
        return null;
      } else {
        console.warn('[garden] fetch failed:', err && err.message);
      }
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function deactivate() {
    _active = false;
    _state = null;
    clearTimerRefresh();
    if (_assetCleanup) {
      _assetCleanup();
      _assetCleanup = null;
    }
    document.body.classList.remove('child-garden-active');
    const view = document.getElementById('skattkammarView');
    if (view) view.classList.remove('gd-exit-through-door');
  }

  async function remountMorgonhusOrSkatt() {
    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.tryMountWorld === 'function') {
      const remounted = await window.ChildMorgonhus.tryMountWorld();
      if (remounted) return true;
      if (typeof window.ChildMorgonhus.tryRemountCached === 'function'
          && window.ChildMorgonhus.tryRemountCached()) {
        return true;
      }
      if (typeof window.ChildMorgonhus.openSkattkammaren === 'function') {
        window.ChildMorgonhus.openSkattkammaren();
        return true;
      }
    }
    if (typeof window.loadRewards === 'function') {
      window.rewardsLoaded = false;
      window.loadRewards();
    }
    return false;
  }

  async function mount(state, opts) {
    const view = document.getElementById('skattkammarView');
    if (!view) return false;

    let sceneState = state;
    let viaTransition = opts && opts.viaTransition;
    if (sceneState && sceneState.viaTransition && sceneState.enabled === undefined) {
      viaTransition = true;
      sceneState = null;
    }

    sceneState = sceneState || await fetchState();
    if (!sceneState || !sceneState.enabled) return false;

    const p = pipeline();
    if (p && typeof p.preloadScene === 'function') {
      const sceneOk = await p.preloadScene(5000);
      if (!sceneOk) {
        console.warn('[garden] scene-bg unavailable — staying in Morgonhus');
        return false;
      }
    }

    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.deactivate === 'function') {
      window.ChildMorgonhus.deactivate();
    }

    _prefersReducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    _state = sceneState;
    _active = true;
    if (!viaTransition) {
      view.classList.add('gd-exit-through-door');
    }
    view.innerHTML = renderScene(sceneState);
    bindInteractions(view);
    bindAssetWatch(view);
    finishEnterAnimation(view);
    applyLivingSlotVisuals(view, sceneState);
    hideLoader();
    document.body.classList.add('child-garden-active');
    document.body.classList.remove('child-morgonhus-active');
    scheduleTimerRefresh(sceneState);
    return true;
  }

  async function enterFromMorgonhus(opts) {
    if (opts && opts.viaTransition) {
      return mount(null, { viaTransition: true });
    }
    if (window.LivingWorldTransition
        && typeof window.LivingWorldTransition.enterGarden === 'function') {
      return window.LivingWorldTransition.enterGarden({
        doorEl: opts && opts.doorEl,
      });
    }
    return mount();
  }

  async function exitToMorgonhus() {
    deactivate();
    return remountMorgonhusOrSkatt();
  }

  function isActive() {
    return _active;
  }

  window.ChildGarden = {
    API_PATH: API_PATH,
    renderScene: renderScene,
    mount: mount,
    enterFromMorgonhus: enterFromMorgonhus,
    exitToMorgonhus: exitToMorgonhus,
    deactivate: deactivate,
    isActive: isActive,
    triggerVisual: triggerVisual,
    visualTokenClass: visualTokenClass,
    applyLivingSlotVisuals: applyLivingSlotVisuals,
  };
})();
