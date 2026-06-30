/**
 * child-garden.js — Trädgården illustrated asset scene (presentation only).
 * Primary visual: scene-bg.webp via <picture>. CSS = layout + animation only.
 */
(function () {
  'use strict';

  const API_PATH = '/api/me/garden';
  const FETCH_TIMEOUT_MS = 8000;
  const TAP_RESET_MS = 1200;

  let _active = false;
  let _state = null;
  let _prefersReducedMotion = false;
  let _assetCleanup = null;

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
      '<source type="image/webp" media="(max-width: 430px)" srcset="/assets/worlds/garden/scene-bg-430.webp" />' +
      '<source type="image/webp" media="(max-width: 860px)" srcset="/assets/worlds/garden/scene-bg-860.webp" />' +
      '<img class="gd-scene-bg" data-asset-id="scene-bg" data-critical="true"' +
        ' src="/assets/worlds/garden/scene-bg.webp"' +
        ' srcset="/assets/worlds/garden/scene-bg-430.webp 430w, /assets/worlds/garden/scene-bg-860.webp 860w, /assets/worlds/garden/scene-bg-1280.webp 1280w"' +
        ' sizes="100vw" alt="" decoding="async" loading="eager" fetchpriority="high" />' +
      '</picture>';
  }

  function renderScene(state) {
    const scenery = (state && state.scenery) || [];
    const hotspotIds = scenery.map(function (s) { return s.scenery_id; });

    function hotspot(id, className, label) {
      if (hotspotIds.indexOf(id) === -1) return '';
      return '<button type="button" class="gd-hotspot ' + className + '"' +
        ' data-scenery="' + esc(id) + '"' +
        ' aria-label="' + esc(label || id) + '"></button>';
    }

    return '<div class="gd-scene gd-scene--illustrated gd-scene--entering" data-world="garden" role="img" aria-label="Trädgården">' +
      '<div class="gd-scene-canvas" aria-hidden="true">' +
        scenePictureMarkup() +
        '<div class="gd-ambient gd-ambient--clouds" aria-hidden="true"></div>' +
        '<div class="gd-tap-pulse" id="gdTapPulse" aria-hidden="true"></div>' +
      '</div>' +
      hotspot('garden_path', 'gd-hotspot--path', 'Stigen') +
      hotspot('garden_bed', 'gd-hotspot--bed', 'Blomsterbädden') +
      hotspot('garden_sky', 'gd-hotspot--sky', 'Himlen') +
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

  function bindInteractions(root) {
    if (!root) return;

    root.querySelectorAll('.gd-hotspot').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-scenery');
        btn.classList.add('is-tapped');
        setTimeout(function () { btn.classList.remove('is-tapped'); }, 280);
        triggerVisual(root, id);
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

    const viaTransition = opts && opts.viaTransition;

    const sceneState = state || await fetchState();
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
    hideLoader();
    document.body.classList.add('child-garden-active');
    document.body.classList.remove('child-morgonhus-active');
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
  };
})();
