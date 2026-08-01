/**
 * child-catalog-room.js — Illustrated catalog rooms via shared Living World catalog.
 * Fail-closed: missing scene-bg → exit to parent (Morgonhus / hall / garden).
 */
(function () {
  'use strict';

  const TAP_RESET_MS = 1200;
  const TOAST_MS = 2200;

  let _active = false;
  let _worldId = null;
  let _room = null;
  let _prefersReducedMotion = false;
  let _assetCleanup = null;

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function catalog() {
    return window.LivingWorldScenesCatalog || null;
  }

  function pipeline(worldId) {
    const pipelines = window.RoomAssetPipelines || {};
    return pipelines[worldId || _worldId] || null;
  }

  function roomById(worldId) {
    const c = catalog();
    return c && typeof c.getRoomByWorldId === 'function' ? c.getRoomByWorldId(worldId) : null;
  }

  function scenePictureMarkup(worldId) {
    const p = pipeline(worldId);
    if (p && typeof p.scenePictureHtml === 'function') {
      return p.scenePictureHtml();
    }
    return '';
  }

  function hotspotStyle(hit) {
    if (!hit) return '';
    return 'left:' + (hit.x * 100) + '%;top:' + (hit.y * 100) + '%;' +
      'width:' + (hit.w * 100) + '%;height:' + (hit.h * 100) + '%;';
  }

  function renderScene(room) {
    const prefix = room.class_prefix;
    const hotspots = (room.hotspots || []).map(function (h) {
      const navClass = h.interaction === 'navigate' ? ' ' + prefix + '-hotspot--nav' : '';
      return '<button type="button" class="' + prefix + '-hotspot' + navClass + '"' +
        ' data-hotspot="' + esc(h.hotspot_id) + '"' +
        ' data-interaction="' + esc(h.interaction) + '"' +
        (h.target_scene ? ' data-target="' + esc(h.target_scene) + '"' : '') +
        ' style="' + hotspotStyle(h.hit_area) + '"' +
        ' aria-label="' + esc(h.label_sv) + '"></button>';
    }).join('');

    return '<div class="cr-scene cr-scene--illustrated cr-scene--' + esc(room.class_prefix) +
      ' cr-scene--entering" data-world="' + esc(room.world_id) + '" role="img"' +
      ' aria-label="' + esc(room.display_name_sv) + '">' +
      '<div class="cr-scene-canvas" aria-hidden="true">' +
        scenePictureMarkup(room.world_id) +
        '<div class="cr-tap-pulse" aria-hidden="true"></div>' +
      '</div>' +
      hotspots +
      '<button type="button" class="cr-back-fab" id="crBackFab" aria-label="' +
        esc(room.exit_label_sv || 'Tillbaka') + '">' +
        '<span class="cr-back-icon" aria-hidden="true"></span>' +
      '</button>' +
      '<div class="cr-scene-toast cr-toast-off" id="crSceneToast" role="status" aria-live="polite"></div>' +
    '</div>';
  }

  function showToast(root, message) {
    const toast = root.querySelector('#crSceneToast');
    if (!toast || !message) return;
    toast.textContent = message;
    toast.classList.remove('cr-toast-off');
    toast.classList.add('is-visible');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      toast.classList.remove('is-visible');
      toast.classList.add('cr-toast-off');
    }, TOAST_MS);
  }

  function triggerPulse(root) {
    if (_prefersReducedMotion) return;
    const pulse = root.querySelector('.cr-tap-pulse');
    if (!pulse) return;
    pulse.classList.remove('is-active');
    void pulse.offsetWidth;
    pulse.classList.add('is-active');
    setTimeout(function () { pulse.classList.remove('is-active'); }, TAP_RESET_MS);
  }

  async function navigateToTarget(targetScene, btn) {
    const c = catalog();
    const targetRoom = c && c.getRoomBySceneId ? c.getRoomBySceneId(targetScene) : null;

    if (targetScene === 'garden' && window.LivingWorldTransition
        && typeof window.LivingWorldTransition.enterGarden === 'function') {
      deactivate();
      return window.LivingWorldTransition.enterGarden({ doorEl: btn });
    }

    if (targetRoom && targetRoom.wire_in && !targetRoom.wired_via
        && window.LivingWorldTransition
        && typeof window.LivingWorldTransition.enterWorld === 'function') {
      deactivate();
      return window.LivingWorldTransition.enterWorld(targetRoom.world_id, { triggerEl: btn });
    }

    return false;
  }

  async function handleHotspotTap(root, btn) {
    const interaction = btn.getAttribute('data-interaction');
    const label = btn.getAttribute('aria-label') || '';
    const target = btn.getAttribute('data-target');

    if (interaction === 'navigate' && target) {
      const entered = await navigateToTarget(target, btn);
      if (!entered) {
        triggerPulse(root);
        showToast(root, label + ' är inte redo än.');
      }
      return;
    }

    triggerPulse(root);
    if (interaction === 'inspect' || interaction === 'activate') {
      showToast(root, label);
    }
  }

  function bindInteractions(root, room) {
    root.querySelectorAll('[data-hotspot]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.classList.add('is-tapped');
        setTimeout(function () { btn.classList.remove('is-tapped'); }, 280);
        handleHotspotTap(root, btn);
      });
    });

    const back = root.querySelector('#crBackFab');
    if (back) {
      back.addEventListener('click', function () {
        exitToParent(room);
      });
    }
  }

  async function exitToParent(room) {
    if (window.LivingWorldTransition
        && typeof window.LivingWorldTransition.isActive === 'function'
        && window.LivingWorldTransition.isActive()
        && typeof window.LivingWorldTransition.exitWorld === 'function'
        && _worldId) {
      await window.LivingWorldTransition.exitWorld(_worldId);
      return;
    }
    deactivate();
    await remountParentForRoom(room);
  }

  async function remountMorgonhus() {
    if (window.ChildWorlds && ChildWorlds.isWorldHubEntryDisabled && ChildWorlds.isWorldHubEntryDisabled()) {
      if (typeof window.loadRewards === 'function') {
        window.rewardsLoaded = false;
        await window.loadRewards({ skipHub: true });
      }
      return false;
    }
    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.tryMountWorld === 'function') {
      if (await window.ChildMorgonhus.tryMountWorld()) return true;
      if (typeof window.ChildMorgonhus.tryRemountCached === 'function'
          && window.ChildMorgonhus.tryRemountCached()) return true;
    }
    if (typeof window.loadRewards === 'function') {
      window.rewardsLoaded = false;
      window.loadRewards();
    }
    return false;
  }

  async function remountGarden() {
    if (window.LivingWorldTransition
        && typeof window.LivingWorldTransition.enterGarden === 'function') {
      deactivate();
      return window.LivingWorldTransition.enterGarden({ viaTransition: true });
    }
    if (window.ChildGarden && typeof window.ChildGarden.mount === 'function') {
      deactivate();
      return window.ChildGarden.mount(null, { viaTransition: true });
    }
    return false;
  }

  async function remountParentForRoom(room) {
    if (!room) return remountMorgonhus();
    if (room.exit_target === 'routine_home') {
      return remountMorgonhus();
    }
    if (room.exit_target === 'garden') {
      return remountGarden();
    }
    const parent = roomById(room.exit_target);
    if (parent && parent.wire_in && !parent.wired_via) {
      return mount(parent.world_id, { viaTransition: true });
    }
    return remountMorgonhus();
  }

  function bindAssetWatch(root, worldId) {
    if (_assetCleanup) {
      _assetCleanup();
      _assetCleanup = null;
    }
    const p = pipeline(worldId);
    if (!p || typeof p.watchSceneImage !== 'function') return;
    _assetCleanup = p.watchSceneImage(root, function () {
      console.warn('[catalog-room] scene-bg failed — exiting', worldId);
      const room = roomById(worldId);
      if (room) exitToParent(room);
      else deactivate();
    });
  }

  function finishEnterAnimation(root) {
    const scene = root && root.querySelector('.cr-scene');
    if (!scene) return;
    if (_prefersReducedMotion) {
      scene.classList.remove('cr-scene--entering');
      return;
    }
    function onEnd() {
      scene.classList.remove('cr-scene--entering');
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

  function deactivate() {
    _active = false;
    _worldId = null;
    _room = null;
    if (_assetCleanup) {
      _assetCleanup();
      _assetCleanup = null;
    }
    document.body.classList.remove('child-catalog-room-active');
    const view = document.getElementById('skattkammarView');
    if (view) view.classList.remove('cr-exit-through-door');
  }

  async function mount(worldId, opts) {
    if (window.ChildWorlds && ChildWorlds.isWorldHubEntryDisabled
        && ChildWorlds.isWorldHubEntryDisabled()) {
      return false;
    }
    const view = document.getElementById('skattkammarView');
    if (!view) return false;

    const room = roomById(worldId);
    if (!room || !room.wire_in || room.wired_via) return false;

    const p = pipeline(worldId);
    if (p && typeof p.preloadScene === 'function') {
      const sceneOk = await p.preloadScene(5000);
      if (!sceneOk) {
        console.warn('[catalog-room] scene-bg unavailable —', worldId);
        return false;
      }
    }

    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.deactivate === 'function') {
      window.ChildMorgonhus.deactivate();
    }
    if (window.ChildGarden && typeof window.ChildGarden.deactivate === 'function') {
      window.ChildGarden.deactivate();
    }

    _prefersReducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    _worldId = worldId;
    _room = room;
    _active = true;

    const viaTransition = opts && opts.viaTransition;
    if (!viaTransition) view.classList.add('cr-exit-through-door');

    view.innerHTML = renderScene(room);
    bindInteractions(view, room);
    bindAssetWatch(view, worldId);
    finishEnterAnimation(view);
    hideLoader();
    document.body.classList.add('child-catalog-room-active');
    document.body.classList.remove('child-morgonhus-active', 'child-garden-active');
    return true;
  }

  function registerTransitionHandlers() {
    const c = catalog();
    if (!c || !c.rooms || !window.LivingWorldTransition) return;

    c.rooms.forEach(function (room) {
      if (!room.wire_in || room.wired_via) return;

      window.LivingWorldTransition.registerWorld(room.world_id, {
        globalKey: 'ChildCatalogRoom',
        triggerOpt: 'triggerEl',
        doorWait: false,
        canEnter: function (state) {
          if (state.entering || state.exiting) return false;
          if (state.activeWorldId && state.activeWorldId !== room.world_id) return false;
          return true;
        },
        canExit: function (state) {
          return state.active && state.activeWorldId === room.world_id && !state.exiting;
        },
        mount: async function () {
          return mount(room.world_id, { viaTransition: true });
        },
        deactivate: function () {
          deactivate();
        },
        onMountFail: async function () {
          return remountParentForRoom(room);
        },
        onEnterError: function () {
          deactivate();
        },
        remountParent: async function () {
          return remountParentForRoom(room);
        },
      });
    });
  }

  registerTransitionHandlers();

  window.ChildCatalogRoom = {
    mount: mount,
    deactivate: deactivate,
    isActive: function () { return _active; },
    activeWorldId: function () { return _worldId; },
    renderScene: renderScene,
  };
})();
