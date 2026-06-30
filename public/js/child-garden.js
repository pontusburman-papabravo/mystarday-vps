/**
 * child-garden.js — Trädgården immersive place (presentation only).
 * Enter from Morgonhus door · visual ambient world · no toasts.
 */
(function () {
  'use strict';

  const API_PATH = '/api/me/garden';
  const FETCH_TIMEOUT_MS = 8000;
  const TAP_RESET_MS = 1400;

  let _active = false;
  let _state = null;
  let _prefersReducedMotion = false;

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
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

    return '<div class="gd-scene gd-scene--entering" data-world="garden" role="img" aria-label="Trädgården">' +
      '<div class="gd-sky" aria-hidden="true">' +
        '<div class="gd-sun"></div>' +
        '<div class="gd-cloud gd-cloud--a"></div>' +
        '<div class="gd-cloud gd-cloud--b"></div>' +
        '<div class="gd-cloud gd-cloud--c"></div>' +
        '<div class="gd-bird" id="gdBird"></div>' +
      '</div>' +
      '<div class="gd-house-edge" aria-hidden="true">' +
        '<div class="gd-house-wall"></div>' +
        '<div class="gd-door-frame"></div>' +
        '<div class="gd-door-light"></div>' +
        '<div class="gd-door-mat"></div>' +
      '</div>' +
      '<div class="gd-world" aria-hidden="true">' +
        '<div class="gd-hills"></div>' +
        '<div class="gd-hill-tree"></div>' +
        '<div class="gd-lake"></div>' +
        '<div class="gd-fence"></div>' +
        '<div class="gd-path" id="gdPath"></div>' +
        '<div class="gd-flower-bed" id="gdFlowerBed">' +
          '<span class="gd-sunflower"></span>' +
          '<span class="gd-wildflower gd-wildflower--a"></span>' +
          '<span class="gd-wildflower gd-wildflower--b"></span>' +
        '</div>' +
        '<div class="gd-tree">' +
          '<span class="gd-swing"></span>' +
          '<span class="gd-birdhouse"></span>' +
        '</div>' +
        '<div class="gd-grass gd-grass--back"></div>' +
        '<div class="gd-grass gd-grass--mid"></div>' +
        '<div class="gd-grass gd-grass--front"></div>' +
        '<div class="gd-leaves">' +
          '<span class="gd-leaf gd-leaf--1"></span>' +
          '<span class="gd-leaf gd-leaf--2"></span>' +
          '<span class="gd-leaf gd-leaf--3"></span>' +
          '<span class="gd-leaf gd-leaf--4"></span>' +
        '</div>' +
      '</div>' +
      hotspot('garden_path', 'gd-hotspot--path', 'Stigen') +
      hotspot('garden_bed', 'gd-hotspot--bed', 'Blomsterbädden') +
      hotspot('garden_sky', 'gd-hotspot--sky', 'Himlen') +
      '<div class="gd-sparkles" id="gdSparkles" aria-hidden="true"></div>' +
      '<div class="gd-butterfly" id="gdButterfly" aria-hidden="true"></div>' +
      '<button type="button" class="gd-back-fab" id="gdBackMorgonhus" aria-label="Tillbaka till Morgonhuset">' +
        '<span class="gd-back-icon" aria-hidden="true"></span>' +
      '</button>' +
    '</div>';
  }

  function triggerVisual(root, sceneryId) {
    if (!root) return;
    const path = root.querySelector('#gdPath');
    const bed = root.querySelector('#gdFlowerBed');
    const bird = root.querySelector('#gdBird');
    const butterfly = root.querySelector('#gdButterfly');
    const leaves = root.querySelectorAll('.gd-leaf');

    if (sceneryId === 'garden_path' && path) {
      path.classList.add('is-glow');
      spawnSparkles(root);
      setTimeout(function () { path.classList.remove('is-glow'); }, TAP_RESET_MS);
      return;
    }
    if (sceneryId === 'garden_bed' && bed) {
      bed.classList.add('is-bloom');
      if (butterfly) {
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

    _state = sceneState;
    _active = true;
    view.classList.add('gd-exit-through-door');
    view.innerHTML = renderScene(sceneState);
    bindInteractions(view);
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
