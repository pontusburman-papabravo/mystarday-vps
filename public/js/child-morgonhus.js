/**
 * child-morgonhus.js — Playable Morgonhuset scene (routine_home).
 * Immersive illustrated place — scene hotspots for play, wayfinder for orientation.
 */
(function () {
  'use strict';

  const API_PATH = '/api/me/morgonhus';
  const REACTION_MS = 6500;
  const TAP_MS = 1800;

  let _active = false;
  let _preferSkatt = false;
  let _state = null;
  let _cachedSceneState = null;
  let _prefersReducedMotion = false;
  let _assetCleanup = null;
  let _ambientMount = null;

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function getAssetPipeline() {
    return window.MorgonhusAssetPipeline || null;
  }

  function scenePictureMarkup() {
    const p = getAssetPipeline();
    if (p && typeof p.scenePictureHtml === 'function') {
      return p.scenePictureHtml();
    }
    return '<picture class="morg-scene-picture" data-asset-id="scene">' +
      '<img class="morg-scene-bg" data-asset-id="scene" data-critical="true"' +
        ' src="/images/child/morgonhus/scene@2x.webp" alt="" decoding="async"' +
        ' loading="eager" fetchpriority="high" />' +
      '</picture>';
  }

  function wayfinderConfig(state) {
    return {
      placeId: 'morgonhus',
      placeLabel: (state && state.display_name) || 'Morgonhuset',
      placeIcon: '🏠',
      immersive: true,
      actions: [],
    };
  }

  function feedbackForAmbientObject(obj, state) {
    if (!obj) return null;
    if (obj.prop_id && state) {
      const prop = findProp(state, obj.prop_id);
      if (prop && prop.unlocked && obj.feedback_unlocked_sv) {
        return obj.feedback_unlocked_sv;
      }
    }
    return obj.feedback_sv || null;
  }

  function handleAmbientAction(root, payload) {
    const obj = payload && payload.object;
    const btn = payload && payload.button;
    const action = (payload && payload.action) || 'ambient';
    const state = payload && payload.state;

    const feedback = feedbackForAmbientObject(obj, state);
    if (feedback) showToast(root, feedback);

    if (action === 'navigate_garden') {
      return enterGardenFromDoor(root, btn);
    }
    if (action === 'open_skattkammaren') {
      openSkattkammaren();
      return true;
    }
    return true;
  }

  function ambientContext(root, state) {
    return {
      prefersReducedMotion: _prefersReducedMotion,
      onPulse: function () { triggerPulse(root); },
      onAction: function (payload) {
        return handleAmbientAction(root, Object.assign({}, payload, { state: state || _state }));
      },
    };
  }

  function mountAmbientObjects(root, state) {
    if (_ambientMount && typeof _ambientMount.destroy === 'function') {
      _ambientMount.destroy();
      _ambientMount = null;
    }
    const rt = window.AmbientObjectRuntime;
    const canvas = root && root.querySelector('.mh-scene-canvas');
    if (!rt || !canvas || typeof rt.mount !== 'function') return;
    _ambientMount = rt.mount(canvas, {
      sceneId: 'routine_home',
      state: state,
      context: ambientContext(root),
    });
  }

  function refreshAmbientObjects(root, state) {
    const rt = window.AmbientObjectRuntime;
    if (!rt || typeof rt.refresh !== 'function' || !root) return;
    rt.refresh(root, 'routine_home', state, ambientContext(root));
    applyUnlockedState(root, state);
  }

  function renderSceneInner(state) {
    const title = (state && state.display_name) || 'Morgonhuset';
    const rt = window.AmbientObjectRuntime;
    const ambientHtml = rt && typeof rt.renderLayer === 'function'
      ? rt.renderLayer('routine_home', state, ambientContext({}, state))
      : '';

    return '<div class="mh-scene mh-scene--illustrated mh-scene--entering" data-world="routine_home"' +
      ' role="img" aria-label="' + esc(title) + '">' +
      '<div class="mh-scene-canvas" aria-hidden="true">' +
        scenePictureMarkup() +
        ambientHtml +
        '<div class="mh-tap-pulse" id="mhTapPulse" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="mh-scene-toast mh-toast-off" id="mhSceneToast" role="status"' +
        ' aria-live="polite" aria-atomic="true"></div>' +
    '</div>';
  }

  function renderScene(state) {
    const inner = renderSceneInner(state);
    const wf = window.ChildWorldWayfinder;
    if (!wf || typeof wf.render !== 'function') {
      return inner;
    }
    return '<div class="cww-shell">' +
      wf.render(wayfinderConfig(state)) +
      '<div class="cww-scene-stage">' + inner + '</div>' +
    '</div>';
  }

  function bindWayfinder(root, state, handlers) {
    const wf = window.ChildWorldWayfinder;
    if (!wf || typeof wf.bind !== 'function' || !root) return;

    const h = handlers || {};
    wf.bind(root, {
      onBack: function () {
        deactivate();
        if (window.ChildWorldHub && typeof window.ChildWorldHub.show === 'function') {
          window.ChildWorldHub.show();
        }
      },
      onAction: async function () {},
    });
  }

  function findProp(state, propId) {
    return (state.props || []).find(function (p) { return p.prop_id === propId; }) || null;
  }

  function showToast(root, message) {
    const toast = root.querySelector('#mhSceneToast');
    if (!toast || !message) return;
    toast.textContent = message;
    toast.classList.remove('mh-toast-off');
    toast.classList.add('is-visible');
    clearTimeout(showToast._timer);
    function dismiss() {
      toast.classList.remove('is-visible');
      toast.classList.add('mh-toast-off');
      if (typeof toast.removeEventListener === 'function') {
        toast.removeEventListener('click', dismiss);
      }
    }
    if (toast.style) {
      toast.style.pointerEvents = 'auto';
      toast.style.cursor = 'pointer';
    }
    if (typeof toast.setAttribute === 'function') {
      toast.setAttribute('role', 'button');
      toast.setAttribute('aria-label', message + ' — tryck för att stänga');
    }
    if (typeof toast.addEventListener === 'function') {
      toast.addEventListener('click', dismiss);
    }
    showToast._timer = setTimeout(dismiss, REACTION_MS);
  }

  function triggerPulse(root) {
    if (_prefersReducedMotion) return;
    const pulse = root.querySelector('#mhTapPulse');
    if (!pulse) return;
    pulse.classList.remove('is-active');
    void pulse.offsetWidth;
    pulse.classList.add('is-active');
    setTimeout(function () { pulse.classList.remove('is-active'); }, TAP_MS);
  }

  function triggerReaction(btn, token) {
    if (_prefersReducedMotion) return;
    btn.classList.add('is-tapped');
    if (token) btn.classList.add('mh-token-active--' + token);
    setTimeout(function () {
      btn.classList.remove('is-tapped');
      if (token) btn.classList.remove('mh-token-active--' + token);
    }, TAP_MS);
  }

  function applyUnlockedState(root, state) {
    if (!root || !state) return;
    (state.props || []).forEach(function (prop) {
      const btn = root.querySelector('[data-prop="' + prop.prop_id + '"]')
        || root.querySelector('[data-ao-id="' + prop.prop_id + '"]');
      if (!btn) return;
      btn.classList.toggle('is-unlocked', Boolean(prop.unlocked));
      btn.classList.toggle('is-locked', !prop.unlocked);
      if (prop.visual_token) {
        btn.classList.add('mh-token--' + prop.visual_token);
      }
    });
  }

  async function enterGardenFromDoor(root, btn) {
    if (window.LivingWorldTransition
        && typeof window.LivingWorldTransition.enterGarden === 'function') {
      triggerReaction(btn, null);
      const entered = await window.LivingWorldTransition.enterGarden({ doorEl: btn });
      if (!entered) {
        triggerPulse(root);
        showToast(root, 'Trädgården är inte redo just nu. Du är kvar i Morgonhuset.');
      }
      return entered;
    }
    if (window.ChildGarden && typeof window.ChildGarden.enterFromMorgonhus === 'function') {
      triggerReaction(btn, null);
      const entered = await window.ChildGarden.enterFromMorgonhus();
      if (!entered) {
        triggerPulse(root);
        showToast(root, 'Trädgården är inte redo just nu. Du är kvar i Morgonhuset.');
      }
      return entered;
    }
    return false;
  }

  async function enterHall(root, btn) {
    if (!window.LivingWorldTransition
        || typeof window.LivingWorldTransition.enterWorld !== 'function') {
      return false;
    }
    triggerReaction(btn, null);
    const entered = await window.LivingWorldTransition.enterWorld('home_hall', { triggerEl: btn });
    if (!entered) {
      triggerPulse(root);
      showToast(root, 'Hallen är inte redo just nu.');
    }
    return entered;
  }

  function bindAmbientObjects(root, state) {
    if (!root || !state) return;
    const rt = window.AmbientObjectRuntime;
    if (!rt || typeof rt.bindLayer !== 'function') return;
    if (_ambientMount && typeof _ambientMount.unbind === 'function') {
      _ambientMount.unbind();
    }
    const unbind = rt.bindLayer(root, 'routine_home', state, ambientContext(root));
    _ambientMount = { unbind: unbind, destroy: function () { unbind(); } };
  }

  function bindInteractions(root, state, handlers) {
    if (!root || !state) return;
    bindWayfinder(root, state, handlers);
    bindAmbientObjects(root, state);
  }

  function bindAssetWatch(root) {
    if (_assetCleanup) {
      _assetCleanup();
      _assetCleanup = null;
    }
    const p = getAssetPipeline();
    if (!p || typeof p.watchSceneImage !== 'function') return;
    _assetCleanup = p.watchSceneImage(root, function () {
      console.warn('[morgonhus] scene failed — staying on gradient fallback');
    });
  }

  function finishEnterAnimation(root) {
    const scene = root && root.querySelector('.mh-scene');
    if (!scene) return;
    if (_prefersReducedMotion) {
      scene.classList.remove('mh-scene--entering');
      return;
    }
    function onEnd() {
      scene.classList.remove('mh-scene--entering');
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

  function snapshotScene() {
    if (_state) {
      _cachedSceneState = JSON.parse(JSON.stringify(_state));
    }
  }

  function deactivate() {
    if (_active && _state) snapshotScene();
    _active = false;
    _state = null;
    if (_assetCleanup) {
      _assetCleanup();
      _assetCleanup = null;
    }
    if (_ambientMount && typeof _ambientMount.destroy === 'function') {
      _ambientMount.destroy();
      _ambientMount = null;
    }
    if (window.AmbientObjectRuntime && typeof window.AmbientObjectRuntime.clearCooldowns === 'function') {
      window.AmbientObjectRuntime.clearCooldowns('routine_home');
    }
    if (window.AmbientDirector && typeof window.AmbientDirector.reset === 'function') {
      window.AmbientDirector.reset();
    }
    document.body.classList.remove('child-morgonhus-active');
    if (window.ChildWorldWayfinder && typeof window.ChildWorldWayfinder.clearActivePlace === 'function') {
      window.ChildWorldWayfinder.clearActivePlace(document);
    }
  }

  function openSkattkammaren() {
    _active = false;
    _preferSkatt = true;
    _state = null;
    document.body.classList.remove('child-morgonhus-active');
    if (window.ChildGarden && typeof window.ChildGarden.deactivate === 'function') {
      window.ChildGarden.deactivate();
    }
    if (typeof window.loadRewards === 'function') {
      window.rewardsLoaded = false;
      window.loadRewards();
    }
  }

  function shouldPreferSkatt() {
    return _preferSkatt;
  }

  function clearPreferSkatt() {
    _preferSkatt = false;
  }

  function mountSceneIntoView(view, state) {
    document.body.classList.add('child-morgonhus-active');
    document.body.classList.remove('child-garden-active', 'child-catalog-room-active');
    view.innerHTML = renderScene(state);
    applyUnlockedState(view, state);
    bindInteractions(view, state, {
      onSkattLink: openSkattkammaren,
    });
    bindAssetWatch(view);
    finishEnterAnimation(view);
    hideLoader();
    if (window.ChildWorldWayfinder && typeof window.ChildWorldWayfinder.setActivePlace === 'function') {
      window.ChildWorldWayfinder.setActivePlace(document, 'morgonhus');
    }
    if (window.PlatformFeedback && typeof window.PlatformFeedback.showPendingHintIfAny === 'function') {
      setTimeout(function () { window.PlatformFeedback.showPendingHintIfAny(); }, 500);
    }
  }

  function tryRemountCached() {
    if (!_cachedSceneState) return false;
    const view = document.getElementById('skattkammarView');
    if (!view) return false;

    _state = _cachedSceneState;
    _active = true;
    mountSceneIntoView(view, _state);
    return true;
  }

  async function fetchState() {
    if (!window.Auth || typeof window.Auth.api !== 'function') return null;
    try {
      return await window.Auth.api(API_PATH);
    } catch (err) {
      if (err && err.status === 503) return null;
      console.warn('[morgonhus] fetch failed:', err && err.message);
      return null;
    }
  }

  async function tryMountWorld() {
    if (_preferSkatt) return false;
    if (window.ChildGarden && window.ChildGarden.isActive && window.ChildGarden.isActive()) return false;
    if (window.LivingWorldTransition && window.LivingWorldTransition.isActive
        && window.LivingWorldTransition.isActive()) return false;
    const view = document.getElementById('skattkammarView');
    if (!view) return false;

    const state = await fetchState();
    if (!state || !state.enabled) return false;

    _prefersReducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    _state = state;
    _active = true;
    mountSceneIntoView(view, state);
    return true;
  }

  async function refresh() {
    if (!_active) return false;
    const state = await fetchState();
    if (!state) return false;
    _state = state;
    const view = document.getElementById('skattkammarView');
    if (view) refreshAmbientObjects(view, state);
    return true;
  }

  function isActive() {
    return _active;
  }

  function propClasses(prop) {
    const classes = ['mh-hotspot', 'mh-hotspot--' + prop.prop_id];
    if (prop.unlocked) classes.push('is-unlocked');
    else classes.push('is-locked');
    if (prop.visual_token) classes.push('mh-token--' + prop.visual_token);
    return classes.join(' ');
  }

  function init() {
    if (window.ChildEventBus) {
      window.ChildEventBus.on('ActivityCompleted', function () {
        if (_active) refresh();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ChildMorgonhus = {
    API_PATH: API_PATH,
    renderScene: renderScene,
    propClasses: propClasses,
    applyUnlockedState: applyUnlockedState,
    bindInteractions: bindInteractions,
    findProp: findProp,
    tryMountWorld: tryMountWorld,
    refresh: refresh,
    isActive: isActive,
    openSkattkammaren: openSkattkammaren,
    enterGardenFromDoor: enterGardenFromDoor,
    deactivate: deactivate,
    snapshotScene: snapshotScene,
    tryRemountCached: tryRemountCached,
    shouldPreferSkatt: shouldPreferSkatt,
    clearPreferSkatt: clearPreferSkatt,
  };
})();
