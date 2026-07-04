/**
 * child-morgonhus.js — Playable Morgonhuset scene (routine_home).
 * Immersive illustrated place: picture + invisible hotspots (not emoji cards).
 */
(function () {
  'use strict';

  const API_PATH = '/api/me/morgonhus';
  const REACTION_MS = 6500;
  const TAP_MS = 1800;

  const HOTSPOTS = {
    welcome_mat: { x: 0.06, y: 0.68, w: 0.38, h: 0.2 },
    first_light: { x: 0.52, y: 0.1, w: 0.38, h: 0.24 },
    door: { x: 0.34, y: 0.28, w: 0.32, h: 0.5 },
  };

  let _active = false;
  let _preferSkatt = false;
  let _state = null;
  let _cachedSceneState = null;
  let _prefersReducedMotion = false;
  let _assetCleanup = null;

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

  function hotspotStyle(hit) {
    if (!hit) return '';
    return 'left:' + (hit.x * 100) + '%;top:' + (hit.y * 100) + '%;' +
      'width:' + (hit.w * 100) + '%;height:' + (hit.h * 100) + '%;';
  }

  function progressionHotspots(props) {
    return (props || []).filter(function (prop) {
      return prop.prop_id !== 'door' && HOTSPOTS[prop.prop_id];
    }).map(function (prop) {
      const hit = HOTSPOTS[prop.prop_id];
      const lockedClass = prop.unlocked ? ' is-unlocked' : ' is-locked';
      return '<button type="button" class="mh-hotspot mh-hotspot--' + esc(prop.prop_id) + lockedClass + '"' +
        ' data-prop="' + esc(prop.prop_id) + '"' +
        ' data-node="' + esc(prop.node_id || '') + '"' +
        ' style="' + hotspotStyle(hit) + '"' +
        ' aria-label="' + esc(prop.label_sv) + '"></button>';
    }).join('');
  }

  function doorHotspot(state) {
    const hit = HOTSPOTS.door;
    const toGarden = Boolean(state && state.gate_to_garden);
    const label = toGarden ? 'Trädgården' : 'Hallen';
    const nav = toGarden ? 'garden' : 'hall';
    const hint = toGarden ? 'Tryck på dörren — ut till trädgården' : 'Tryck på dörren — in i hallen';
    return '<p class="mh-door-hint" aria-hidden="true">' + esc(hint) + '</p>' +
      '<button type="button" class="mh-hotspot mh-hotspot--door mh-hotspot--nav' +
      (toGarden ? ' mh-hotspot--garden' : ' mh-hotspot--hall') + '"' +
      ' data-nav="' + nav + '"' +
      ' style="' + hotspotStyle(hit) + '"' +
      ' aria-label="' + esc(label) + '"></button>';
  }

  function renderScene(state) {
    const title = (state && state.display_name) || 'Morgonhuset';
    const props = (state && state.props) || [];
    const showHallInDock = Boolean(state && state.gate_to_garden);

    return '<div class="mh-scene mh-scene--illustrated mh-scene--entering" data-world="routine_home"' +
      ' role="img" aria-label="' + esc(title) + '">' +
      '<div class="mh-scene-canvas" aria-hidden="true">' +
        scenePictureMarkup() +
        '<div class="mh-tap-pulse" id="mhTapPulse" aria-hidden="true"></div>' +
      '</div>' +
      progressionHotspots(props) +
      doorHotspot(state) +
      '<nav class="mh-nav-dock" aria-label="Utforskning">' +
        '<button type="button" class="mh-nav-btn mh-nav-btn--exterior" id="mhExteriorLink"' +
          ' aria-label="Utanför">🏡<span class="mh-nav-label">Utanför</span></button>' +
        (showHallInDock
          ? '<button type="button" class="mh-nav-btn mh-nav-btn--hall" id="mhHallLink"' +
              ' aria-label="Hallen">🚪<span class="mh-nav-label">Hallen</span></button>'
          : '') +
        '<button type="button" class="mh-nav-btn mh-nav-btn--skatt" id="mhSkattLink"' +
          ' aria-label="Skattkammaren">💎<span class="mh-nav-label">Skatt</span></button>' +
      '</nav>' +
      '<div class="mh-scene-toast mh-toast-off" id="mhSceneToast" role="status"' +
        ' aria-live="polite" aria-atomic="true"></div>' +
    '</div>';
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
      const btn = root.querySelector('[data-prop="' + prop.prop_id + '"]');
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

  function bindInteractions(root, state, handlers) {
    if (!root || !state) return;

    const h = handlers || {};

    root.querySelectorAll('[data-prop]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const propId = btn.getAttribute('data-prop');
        const liveState = _state || state;
        const prop = findProp(liveState, propId);
        if (!prop) return;

        if (prop.unlocked || prop.always_active) {
          triggerReaction(btn, prop.visual_token);
          const msg = prop.child_message || prop.ambient_message || 'Det händer något…';
          showToast(root, msg);
          triggerPulse(root);
          if (h.onPropTap) h.onPropTap(prop);
          return;
        }

        triggerReaction(btn, null);
        showToast(root, prop.locked_hint || 'Inte redo än.');
        if (h.onLockedTap) h.onLockedTap(prop);
      });
    });

    root.querySelectorAll('[data-nav]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const nav = btn.getAttribute('data-nav');
        if (nav === 'garden') {
          const entered = await enterGardenFromDoor(root, btn);
          if (entered && h.onGardenEnter) h.onGardenEnter(findProp(_state || state, 'door'));
          return;
        }
        if (nav === 'hall') {
          await enterHall(root, btn);
        }
      });
    });

    const skattLink = root.querySelector('#mhSkattLink');
    if (skattLink && h.onSkattLink) {
      skattLink.addEventListener('click', h.onSkattLink);
    }

    const hallLink = root.querySelector('#mhHallLink');
    if (hallLink) {
      hallLink.addEventListener('click', function () {
        enterHall(root, hallLink);
      });
    }

    const exteriorLink = root.querySelector('#mhExteriorLink');
    if (exteriorLink) {
      exteriorLink.addEventListener('click', function () {
        if (window.LivingWorldTransition
            && typeof window.LivingWorldTransition.enterWorld === 'function') {
          window.LivingWorldTransition.enterWorld('home_exterior', { triggerEl: exteriorLink }).then(function (entered) {
            if (!entered) {
              showToast(root, 'Utanför är inte redo just nu.');
            }
          });
        }
      });
    }
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
    document.body.classList.remove('child-morgonhus-active');
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
    view.innerHTML = renderScene(state);
    applyUnlockedState(view, state);
    bindInteractions(view, state, {
      onSkattLink: openSkattkammaren,
    });
    bindAssetWatch(view);
    finishEnterAnimation(view);
    hideLoader();
    document.body.classList.add('child-morgonhus-active');
    document.body.classList.remove('child-garden-active', 'child-catalog-room-active');
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
    if (view) applyUnlockedState(view, state);
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
    deactivate: deactivate,
    snapshotScene: snapshotScene,
    tryRemountCached: tryRemountCached,
    shouldPreferSkatt: shouldPreferSkatt,
    clearPreferSkatt: clearPreferSkatt,
  };
})();
