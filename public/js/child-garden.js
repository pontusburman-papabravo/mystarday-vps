/**
 * child-garden.js — Playable Trädgården ambient scene (experience slice).
 * Enter from Morgonhus door · exit back to Morgonhus. No gameplay verbs.
 */
(function () {
  'use strict';

  const API_PATH = '/api/me/garden';
  const AMBIENT_MS = 3200;
  const FETCH_TIMEOUT_MS = 8000;

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
    const title = (state && state.display_name) || 'Trädgården';
    const intro = (state && state.first_enter_message) || '';
    const ambient = (state && state.ambient_message) || '';
    const scenery = (state && state.scenery) || [];

    const sceneryHtml = scenery.map(function (item) {
      return '<div class="gd-scenery gd-scenery--' + esc(item.scenery_id) + '" data-scenery="' + esc(item.scenery_id) + '">' +
        '<span class="gd-scenery-emoji" aria-hidden="true">' + esc(item.emoji || '🌿') + '</span>' +
        '<span class="gd-scenery-label">' + esc(item.label_sv) + '</span>' +
        '</div>';
    }).join('');

    return '<div class="gd-scene" data-world="garden">' +
      '<div class="gd-scene-sky" aria-hidden="true"></div>' +
      '<div class="gd-scene-sun" aria-hidden="true"></div>' +
      '<div class="gd-scene-breeze" aria-hidden="true"></div>' +
      '<header class="gd-scene-header">' +
        '<h1 class="gd-scene-title">' + esc(title) + '</h1>' +
        (intro ? '<p class="gd-scene-intro">' + esc(intro) + '</p>' : '') +
      '</header>' +
      '<div class="gd-scene-ground" role="group" aria-label="Trädgården">' +
        sceneryHtml +
      '</div>' +
      (ambient ? '<p class="gd-scene-ambient">' + esc(ambient) + '</p>' : '') +
      '<div class="gd-scene-toast gd-toast-off" id="gdSceneToast" role="status" aria-live="polite"></div>' +
      '<footer class="gd-scene-footer">' +
        '<button type="button" class="gd-back-btn" id="gdBackMorgonhus">🏠 Tillbaka till Morgonhuset</button>' +
      '</footer>' +
    '</div>';
  }

  function showToast(root, message) {
    const toast = root.querySelector('#gdSceneToast');
    if (!toast || !message) return;
    toast.textContent = message;
    toast.classList.remove('gd-toast-off');
    toast.classList.add('is-visible');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      toast.classList.remove('is-visible');
      toast.classList.add('gd-toast-off');
    }, AMBIENT_MS);
  }

  function bindInteractions(root, state) {
    if (!root || !state) return;

    (state.scenery || []).forEach(function (item) {
      const el = root.querySelector('[data-scenery="' + item.scenery_id + '"]');
      if (!el) return;
      el.addEventListener('click', function () {
        if (!_prefersReducedMotion) {
          el.classList.add('is-tapped');
          setTimeout(function () { el.classList.remove('is-tapped'); }, 400);
        }
        if (item.ambient_message) showToast(root, item.ambient_message);
      });
    });

    const backBtn = root.querySelector('#gdBackMorgonhus');
    if (backBtn) {
      backBtn.addEventListener('click', exitToMorgonhus);
    }
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
    view.innerHTML = renderScene(sceneState);
    bindInteractions(view, sceneState);
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
  };
})();
