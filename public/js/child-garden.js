/**
 * child-garden.js — Trädgården layered asset scene (presentation only).
 * Enter from Morgonhus door · illustrated layers · no toasts.
 */
(function () {
  'use strict';

  const API_PATH = '/api/me/garden';
  const FETCH_TIMEOUT_MS = 8000;
  const TAP_RESET_MS = 1400;

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

  function assetSrc(id) {
    const p = pipeline();
    if (p && typeof p.assetUrl === 'function') {
      return p.assetUrl(id);
    }
    return '/assets/worlds/garden/' + id + '.webp';
  }

  function assetImg(id, className, extraAttrs) {
    const src = assetSrc(id);
    return '<img class="gd-asset ' + esc(className) + '"' +
      ' data-asset-id="' + esc(id) + '"' +
      ' src="' + esc(src) + '"' +
      ' alt="" decoding="async" loading="eager"' +
      (extraAttrs || '') +
      ' />';
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

    return '<div class="gd-scene gd-scene--asset gd-scene--entering" data-world="garden" role="img" aria-label="Trädgården">' +
      '<div class="gd-fallback-bg" aria-hidden="true"></div>' +
      '<div class="gd-layer gd-layer--sky" aria-hidden="true">' +
        assetImg('background', 'gd-asset--background') +
      '</div>' +
      '<div class="gd-layer gd-layer--clouds" aria-hidden="true">' +
        assetImg('clouds', 'gd-asset--clouds') +
      '</div>' +
      '<div class="gd-layer gd-layer--path" aria-hidden="true">' +
        assetImg('path', 'gd-asset--path', ' id="gdPath"') +
        '<div class="gd-path-shimmer" id="gdPathShimmer" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="gd-layer gd-layer--flowers" aria-hidden="true">' +
        assetImg('flowers', 'gd-asset--flowers', ' id="gdFlowerBed"') +
      '</div>' +
      '<div class="gd-layer gd-layer--house" aria-hidden="true">' +
        assetImg('house-left', 'gd-asset--house') +
      '</div>' +
      '<div class="gd-layer gd-layer--foreground" aria-hidden="true">' +
        assetImg('foreground-leaves', 'gd-asset--foreground') +
        '<div class="gd-leaf-particles" aria-hidden="true">' +
          '<span class="gd-leaf-particle gd-leaf-particle--1"></span>' +
          '<span class="gd-leaf-particle gd-leaf-particle--2"></span>' +
          '<span class="gd-leaf-particle gd-leaf-particle--3"></span>' +
          '<span class="gd-leaf-particle gd-leaf-particle--4"></span>' +
        '</div>' +
      '</div>' +
      '<div class="gd-layer gd-layer--actors" aria-hidden="true">' +
        assetImg('bird', 'gd-asset--bird', ' id="gdBird"') +
        assetImg('butterfly', 'gd-asset--butterfly', ' id="gdButterfly"') +
      '</div>' +
      '<div class="gd-vignette" aria-hidden="true"></div>' +
      hotspot('garden_path', 'gd-hotspot--path', 'Stigen') +
      hotspot('garden_bed', 'gd-hotspot--bed', 'Blomsterbädden') +
      hotspot('garden_sky', 'gd-hotspot--sky', 'Himlen') +
      '<div class="gd-sparkles" id="gdSparkles" aria-hidden="true"></div>' +
      '<button type="button" class="gd-back-fab" id="gdBackMorgonhus" aria-label="Tillbaka till Morgonhuset">' +
        '<span class="gd-back-icon" aria-hidden="true"></span>' +
      '</button>' +
    '</div>';
  }

  function triggerVisual(root, sceneryId) {
    if (!root) return;
    const path = root.querySelector('#gdPath');
    const pathShimmer = root.querySelector('#gdPathShimmer');
    const bed = root.querySelector('#gdFlowerBed');
    const bird = root.querySelector('#gdBird');
    const butterfly = root.querySelector('#gdButterfly');
    const leaves = root.querySelectorAll('.gd-leaf-particle');

    if (sceneryId === 'garden_path') {
      if (path) path.classList.add('is-glow');
      if (pathShimmer) pathShimmer.classList.add('is-active');
      spawnSparkles(root);
      setTimeout(function () {
        if (path) path.classList.remove('is-glow');
        if (pathShimmer) pathShimmer.classList.remove('is-active');
      }, TAP_RESET_MS);
      return;
    }
    if (sceneryId === 'garden_bed' && bed) {
      bed.classList.add('is-bloom');
      if (butterfly) {
        butterfly.classList.remove('is-flutter');
        void butterfly.offsetWidth;
        butterfly.classList.add('is-flutter');
        setTimeout(function () { butterfly.classList.remove('is-flutter'); }, TAP_RESET_MS);
      }
      setTimeout(function () { bed.classList.remove('is-bloom'); }, TAP_RESET_MS);
      return;
    }
    if (sceneryId === 'garden_sky') {
      if (bird) {
        bird.classList.remove('is-flying');
        void bird.offsetWidth;
        bird.classList.add('is-flying');
        setTimeout(function () { bird.classList.remove('is-flying'); }, TAP_RESET_MS);
      }
      if (butterfly && !_prefersReducedMotion) {
        butterfly.classList.remove('is-pass');
        void butterfly.offsetWidth;
        butterfly.classList.add('is-pass');
        setTimeout(function () { butterfly.classList.remove('is-pass'); }, TAP_RESET_MS);
      }
      leaves.forEach(function (leaf) {
        leaf.classList.add('is-gust');
        setTimeout(function () { leaf.classList.remove('is-gust'); }, TAP_RESET_MS);
      });
    }
  }

  function spawnSparkles(root) {
    const layer = root.querySelector('#gdSparkles');
    if (!layer || _prefersReducedMotion) return;
    layer.innerHTML = '';
    for (let i = 0; i < 5; i += 1) {
      const s = document.createElement('span');
      s.className = 'gd-sparkle';
      s.style.left = (28 + i * 9 + Math.random() * 6) + '%';
      s.style.bottom = (22 + Math.random() * 8) + '%';
      s.style.animationDelay = (i * 0.08) + 's';
      layer.appendChild(s);
    }
    setTimeout(function () { layer.innerHTML = ''; }, TAP_RESET_MS);
  }

  function bindInteractions(root) {
    if (!root) return;

    root.querySelectorAll('.gd-hotspot').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-scenery');
        btn.classList.add('is-tapped');
        setTimeout(function () { btn.classList.remove('is-tapped'); }, 300);
        triggerVisual(root, id);
      });
    });

    const backBtn = root.querySelector('#gdBackMorgonhus');
    if (backBtn) backBtn.addEventListener('click', exitToMorgonhus);
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

  function bindAssetPipeline(root) {
    if (_assetCleanup) {
      _assetCleanup();
      _assetCleanup = null;
    }
    const p = pipeline();
    if (!p || typeof p.watchSceneAssets !== 'function') return;
    _assetCleanup = p.watchSceneAssets(root);
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

  async function mount(state) {
    const view = document.getElementById('skattkammarView');
    if (!view) return false;

    const sceneState = state || await fetchState();
    if (!sceneState || !sceneState.enabled) return false;

    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.deactivate === 'function') {
      window.ChildMorgonhus.deactivate();
    }

    _prefersReducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const p = pipeline();
    let assetsOk = true;
    if (p && typeof p.preloadCritical === 'function') {
      assetsOk = await p.preloadCritical(5000);
      if (!assetsOk) {
        console.warn('[garden] critical assets preload incomplete — showing fallback layers');
      }
    }

    _state = sceneState;
    _active = true;
    view.classList.add('gd-exit-through-door');
    view.innerHTML = renderScene(sceneState);
    if (!assetsOk) {
      const scene = view.querySelector('.gd-scene');
      if (scene) scene.classList.add('gd-scene--fallback');
    }
    bindInteractions(view);
    bindAssetPipeline(view);
    finishEnterAnimation(view);
    hideLoader();
    document.body.classList.add('child-garden-active');
    document.body.classList.remove('child-morgonhus-active');
    return true;
  }

  async function enterFromMorgonhus() {
    return mount();
  }

  async function exitToMorgonhus() {
    deactivate();
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
