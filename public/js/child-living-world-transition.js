/**
 * child-living-world-transition.js — Living World enter/exit (place, not page).
 * Orchestrates chrome fade, door open, portal zoom, world reveal — and reverse.
 */
(function () {
  'use strict';

  const CHROME_MS = 280;
  const DOOR_MS = 380;
  const THROUGH_MS = 420;
  const REVEAL_MS = 320;

  let _active = false;
  let _activeWorldId = null;
  let _entering = false;
  let _exiting = false;

  /**
   * World registry — mount/deactivate/remount hooks per worldId.
   * IRC-014 (memory_hall) registers here on rebase; garden is the first consumer.
   */
  const WORLD_REGISTRY = {
    garden: {
      globalKey: 'ChildGarden',
      triggerOpt: 'doorEl',
      doorWait: true,
      canEnter: function (state) {
        return !state.active && !state.entering;
      },
      canExit: function (state) {
        return state.active && state.activeWorldId === 'garden' && !state.exiting;
      },
      mount: async function () {
        return window.ChildGarden.mount(null, { viaTransition: true });
      },
      deactivate: function () {
        window.ChildGarden.deactivate();
      },
      onMountFail: async function () {
        if (window.ChildMorgonhus && typeof window.ChildMorgonhus.tryRemountCached === 'function') {
          window.ChildMorgonhus.tryRemountCached();
        }
      },
      onEnterError: function () {
        if (window.ChildGarden && typeof window.ChildGarden.deactivate === 'function') {
          window.ChildGarden.deactivate();
        }
      },
      remountParent: async function () {
        if (window.ChildWorldHub && typeof window.ChildWorldHub.show === 'function') {
          return window.ChildWorldHub.show();
        }
        if (typeof window.loadRewards === 'function') {
          window.rewardsLoaded = false;
          window.loadRewards({ skipHub: true });
        }
        return false;
      },
    },
    memory_hall: {
      globalKey: 'ChildMemoryHall',
      triggerOpt: 'pathEl',
      doorWait: false,
      canEnter: function (state) {
        if (state.entering || state.exiting) return false;
        if (state.activeWorldId && state.activeWorldId !== 'garden') return false;
        return true;
      },
      canExit: function (state) {
        return state.active && state.activeWorldId === 'memory_hall' && !state.exiting;
      },
      beforeMount: async function () {
        if (window.ChildGarden && typeof window.ChildGarden.deactivate === 'function') {
          window.ChildGarden.deactivate();
        }
      },
      mount: async function () {
        return window.ChildMemoryHall.mount(null, { viaTransition: true });
      },
      deactivate: function () {
        window.ChildMemoryHall.deactivate();
      },
      onMountFail: async function () {
        let restored = false;
        if (window.ChildGarden && typeof window.ChildGarden.mount === 'function') {
          restored = await window.ChildGarden.mount(null, { viaTransition: true });
        }
        if (restored) {
          _active = true;
          _activeWorldId = 'garden';
        }
        return restored;
      },
      onEnterError: function () {
        if (window.ChildMemoryHall && typeof window.ChildMemoryHall.deactivate === 'function') {
          window.ChildMemoryHall.deactivate();
        }
      },
      remountParent: async function () {
        if (window.ChildGarden && typeof window.ChildGarden.mount === 'function') {
          return window.ChildGarden.mount(null, { viaTransition: true });
        }
        return false;
      },
      afterExit: async function (restored) {
        return {
          active: !!restored,
          activeWorldId: restored ? 'garden' : null,
          success: restored,
        };
      },
    },
  };

  (function registerMuseumAlias() {
    const hall = WORLD_REGISTRY.memory_hall;
    WORLD_REGISTRY.museum = {
      globalKey: hall.globalKey,
      triggerOpt: hall.triggerOpt,
      doorWait: hall.doorWait,
      canEnter: hall.canEnter,
      canExit: function (state) {
        return state.active && state.activeWorldId === 'museum' && !state.exiting;
      },
      beforeMount: hall.beforeMount,
      mount: hall.mount,
      deactivate: hall.deactivate,
      onMountFail: hall.onMountFail,
      onEnterError: hall.onEnterError,
      remountParent: hall.remountParent,
      afterExit: hall.afterExit,
    };
  }());

  function transitionState() {
    return {
      active: _active,
      activeWorldId: _activeWorldId,
      entering: _entering,
      exiting: _exiting,
    };
  }

  function getWorldModule(world) {
    if (!world || !world.globalKey) return null;
    return window[world.globalKey] || null;
  }

  function worldModuleReady(world, action) {
    const mod = getWorldModule(world);
    if (!mod) return false;
    if (action === 'mount') return typeof mod.mount === 'function';
    if (action === 'deactivate') return typeof mod.deactivate === 'function';
    return false;
  }

  function reducedMotion() {
    return window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function wait(ms) {
    if (reducedMotion()) return Promise.resolve();
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function portalOverlay(show) {
    let el = document.getElementById('lwPortalOverlay');
    if (!show) {
      if (el) el.classList.remove('is-visible');
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'lwPortalOverlay';
      el.className = 'lw-portal-overlay';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    void el.offsetWidth;
    el.classList.add('is-visible');
  }

  function clearPortal() {
    portalOverlay(false);
    const el = document.getElementById('lwPortalOverlay');
    if (el) el.remove();
  }

  function resetEnterClasses(triggerEl) {
    document.body.classList.remove(
      'living-world-entering',
      'living-world-chrome-out',
      'living-world-through',
      'living-world-active',
      'living-world-exiting',
      'living-world-through-reverse'
    );
    const skattView = document.getElementById('skattkammarView');
    const rewardsView = document.getElementById('rewardsView');
    if (skattView) {
      skattView.classList.remove(
        'lw-portal-zoom',
        'lw-portal-zoom-out',
        'lw-world-visible',
        'lw-portal-return'
      );
    }
    if (rewardsView) rewardsView.classList.remove('living-world-rewards-shell');
    if (triggerEl) triggerEl.classList.remove('lw-door-opening');
    clearPortal();
  }

  function resolveTriggerEl(world, opts) {
    if (!world || !world.triggerOpt || !opts) return null;
    return opts[world.triggerOpt] || null;
  }

  async function enterWorld(worldId, opts) {
    const world = WORLD_REGISTRY[worldId];
    if (!world) return false;

    const state = transitionState();
    const canEnter = typeof world.canEnter === 'function'
      ? world.canEnter(state, opts)
      : !state.active && !state.entering;
    if (!canEnter) return false;
    if (!worldModuleReady(world, 'mount')) return false;

    const triggerEl = resolveTriggerEl(world, opts);
    const skattView = document.getElementById('skattkammarView');
    const rewardsView = document.getElementById('rewardsView');

    _entering = true;
    document.body.classList.add('living-world-entering');

    try {
      document.body.classList.add('living-world-chrome-out');
      await wait(CHROME_MS);

      if (triggerEl) triggerEl.classList.add('lw-door-opening');
      if (world.doorWait) await wait(DOOR_MS);

      portalOverlay(true);
      document.body.classList.add('living-world-through');
      if (skattView) skattView.classList.add('lw-portal-zoom');
      await wait(THROUGH_MS);

      if (typeof world.beforeMount === 'function') {
        await world.beforeMount(opts, state);
      }

      const mounted = await world.mount(opts, state);
      if (!mounted) {
        resetEnterClasses(triggerEl);
        if (typeof world.onMountFail === 'function') {
          await world.onMountFail(opts, state);
        }
        _entering = false;
        return false;
      }

      document.body.classList.remove('living-world-through');
      document.body.classList.add('living-world-active');
      if (skattView) {
        skattView.classList.remove('lw-portal-zoom');
        skattView.classList.add('lw-world-visible');
      }
      if (rewardsView) rewardsView.classList.add('living-world-rewards-shell');
      if (triggerEl) triggerEl.classList.remove('lw-door-opening');
      clearPortal();
      await wait(REVEAL_MS);

      _active = true;
      _activeWorldId = worldId;
      return true;
    } catch (err) {
      console.warn('[living-world] enter failed:', err && err.message);
      resetEnterClasses(triggerEl);
      if (typeof world.onEnterError === 'function') {
        world.onEnterError(opts, state);
      }
      return false;
    } finally {
      _entering = false;
      document.body.classList.remove('living-world-entering');
    }
  }

  async function exitWorld(worldId, opts) {
    const world = WORLD_REGISTRY[worldId];
    if (!world) return false;

    const state = transitionState();
    const canExit = typeof world.canExit === 'function'
      ? world.canExit(state, opts)
      : state.active && state.activeWorldId === worldId && !state.exiting;
    if (!canExit) return false;
    if (!worldModuleReady(world, 'deactivate')) return false;

    const skattView = document.getElementById('skattkammarView');
    const rewardsView = document.getElementById('rewardsView');

    _exiting = true;
    document.body.classList.add('living-world-exiting');
    document.body.classList.remove('living-world-active');

    try {
      if (skattView) skattView.classList.add('lw-portal-zoom-out');
      portalOverlay(true);
      await wait(THROUGH_MS);

      world.deactivate(opts, state);
      if (skattView) skattView.classList.remove('lw-world-visible', 'lw-portal-zoom-out');

      let restored = false;
      if (typeof world.remountParent === 'function') {
        restored = await world.remountParent(opts, state);
      }

      document.body.classList.add('living-world-through-reverse');
      if (skattView) skattView.classList.add('lw-portal-return');
      await wait(THROUGH_MS);

      document.body.classList.remove('living-world-through-reverse', 'living-world-chrome-out');
      if (rewardsView) rewardsView.classList.remove('living-world-rewards-shell');
      if (skattView) skattView.classList.remove('lw-portal-return');
      clearPortal();
      await wait(CHROME_MS);

      let exitActive = false;
      let exitWorldId = null;
      let exitSuccess = true;

      if (typeof world.afterExit === 'function') {
        const after = await world.afterExit(restored, opts, state);
        if (after && typeof after === 'object') {
          if ('active' in after) exitActive = after.active;
          if ('activeWorldId' in after) exitWorldId = after.activeWorldId;
          if ('success' in after) exitSuccess = after.success;
        }
      }

      _active = exitActive;
      _activeWorldId = exitWorldId;
      return exitSuccess;
    } catch (err) {
      console.warn('[living-world] exit failed:', err && err.message);
      resetEnterClasses(null);
      _active = false;
      _activeWorldId = null;
      return false;
    } finally {
      _exiting = false;
      document.body.classList.remove('living-world-exiting');
    }
  }

  async function enterGarden(opts) {
    return enterWorld('garden', opts);
  }

  async function exitGarden() {
    return exitWorld('garden');
  }

  async function enterMemoryHall(opts) {
    return enterWorld('memory_hall', opts);
  }

  async function exitMemoryHall() {
    return exitWorld('memory_hall');
  }

  function isActive() {
    return _active;
  }

  function activeWorldId() {
    return _activeWorldId;
  }

  function isTransitioning() {
    return _entering || _exiting;
  }

  function registerWorld(worldId, handlers) {
    if (!worldId || !handlers) return false;
    WORLD_REGISTRY[worldId] = handlers;
    return true;
  }

  window.LivingWorldTransition = {
    enterWorld: enterWorld,
    exitWorld: exitWorld,
    enterGarden: enterGarden,
    exitGarden: exitGarden,
    enterMemoryHall: enterMemoryHall,
    exitMemoryHall: exitMemoryHall,
    registerWorld: registerWorld,
    isActive: isActive,
    activeWorldId: activeWorldId,
    isTransitioning: isTransitioning,
    CHROME_MS: CHROME_MS,
    DOOR_MS: DOOR_MS,
    THROUGH_MS: THROUGH_MS,
    REVEAL_MS: REVEAL_MS,
  };
})();
