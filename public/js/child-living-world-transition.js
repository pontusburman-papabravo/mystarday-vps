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
  let _activeWorld = null;
  let _entering = false;
  let _exiting = false;

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

  function resetEnterClasses(doorEl) {
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
    if (doorEl) doorEl.classList.remove('lw-door-opening');
    clearPortal();
  }

  async function enterGarden(opts) {
    if (_active || _entering) return false;
    if (!window.ChildGarden || typeof window.ChildGarden.mount !== 'function') {
      return false;
    }

    const doorEl = opts && opts.doorEl;
    const skattView = document.getElementById('skattkammarView');
    const rewardsView = document.getElementById('rewardsView');

    _entering = true;
    document.body.classList.add('living-world-entering');

    try {
      document.body.classList.add('living-world-chrome-out');
      await wait(CHROME_MS);

      if (doorEl) doorEl.classList.add('lw-door-opening');
      await wait(DOOR_MS);

      portalOverlay(true);
      document.body.classList.add('living-world-through');
      if (skattView) skattView.classList.add('lw-portal-zoom');
      await wait(THROUGH_MS);

      const mounted = await window.ChildGarden.mount(null, { viaTransition: true });
      if (!mounted) {
        resetEnterClasses(doorEl);
        if (window.ChildMorgonhus && typeof window.ChildMorgonhus.tryRemountCached === 'function') {
          window.ChildMorgonhus.tryRemountCached();
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
      if (doorEl) doorEl.classList.remove('lw-door-opening');
      clearPortal();
      await wait(REVEAL_MS);

      _active = true;
      _activeWorld = 'garden';
      return true;
    } catch (err) {
      console.warn('[living-world] enter failed:', err && err.message);
      resetEnterClasses(doorEl);
      if (window.ChildGarden && typeof window.ChildGarden.deactivate === 'function') {
        window.ChildGarden.deactivate();
      }
      return false;
    } finally {
      _entering = false;
      document.body.classList.remove('living-world-entering');
    }
  }

  async function exitGarden() {
    if (!_active || _exiting) return false;
    if (!window.ChildGarden || typeof window.ChildGarden.deactivate !== 'function') {
      return false;
    }

    const skattView = document.getElementById('skattkammarView');
    const rewardsView = document.getElementById('rewardsView');

    _exiting = true;
    document.body.classList.add('living-world-exiting');
    document.body.classList.remove('living-world-active');

    try {
      if (skattView) skattView.classList.add('lw-portal-zoom-out');
      portalOverlay(true);
      await wait(THROUGH_MS);

      window.ChildGarden.deactivate();
      if (skattView) skattView.classList.remove('lw-world-visible', 'lw-portal-zoom-out');

      let restored = false;
      if (window.ChildMorgonhus) {
        if (typeof window.ChildMorgonhus.tryRemountCached === 'function') {
          restored = window.ChildMorgonhus.tryRemountCached();
        }
        if (!restored && typeof window.ChildMorgonhus.tryMountWorld === 'function') {
          restored = await window.ChildMorgonhus.tryMountWorld();
        }
      }

      document.body.classList.add('living-world-through-reverse');
      if (skattView) skattView.classList.add('lw-portal-return');
      await wait(THROUGH_MS);

      document.body.classList.remove('living-world-through-reverse', 'living-world-chrome-out');
      if (rewardsView) rewardsView.classList.remove('living-world-rewards-shell');
      if (skattView) skattView.classList.remove('lw-portal-return');
      clearPortal();
      await wait(CHROME_MS);

      if (!restored) {
        if (window.ChildMorgonhus && typeof window.ChildMorgonhus.openSkattkammaren === 'function') {
          window.ChildMorgonhus.openSkattkammaren();
        } else if (typeof window.loadRewards === 'function') {
          window.rewardsLoaded = false;
          window.loadRewards();
        }
      }

      _active = false;
      _activeWorld = null;
      return true;
    } catch (err) {
      console.warn('[living-world] exit failed:', err && err.message);
      resetEnterClasses(null);
      _active = false;
      _activeWorld = null;
      return false;
    } finally {
      _exiting = false;
      document.body.classList.remove('living-world-exiting');
    }
  }

  async function enterMemoryHall(opts) {
    if (_entering || _exiting) return false;
    if (_activeWorld && _activeWorld !== 'garden') return false;
    if (!window.ChildMemoryHall || typeof window.ChildMemoryHall.mount !== 'function') {
      return false;
    }

    const pathEl = opts && opts.pathEl;
    const skattView = document.getElementById('skattkammarView');
    const rewardsView = document.getElementById('rewardsView');

    _entering = true;
    document.body.classList.add('living-world-entering');

    try {
      document.body.classList.add('living-world-chrome-out');
      await wait(CHROME_MS);

      if (pathEl) pathEl.classList.add('lw-door-opening');
      portalOverlay(true);
      document.body.classList.add('living-world-through');
      if (skattView) skattView.classList.add('lw-portal-zoom');
      await wait(THROUGH_MS);

      if (window.ChildGarden && typeof window.ChildGarden.deactivate === 'function') {
        window.ChildGarden.deactivate();
      }

      const mounted = await window.ChildMemoryHall.mount(null, { viaTransition: true });
      if (!mounted) {
        resetEnterClasses(pathEl);
        if (window.ChildGarden && typeof window.ChildGarden.mount === 'function') {
          await window.ChildGarden.mount(null, { viaTransition: true });
          _activeWorld = 'garden';
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
      if (pathEl) pathEl.classList.remove('lw-door-opening');
      clearPortal();
      await wait(REVEAL_MS);

      _active = true;
      _activeWorld = 'memory_hall';
      return true;
    } catch (err) {
      console.warn('[living-world] enter memory hall failed:', err && err.message);
      resetEnterClasses(pathEl);
      if (window.ChildMemoryHall && typeof window.ChildMemoryHall.deactivate === 'function') {
        window.ChildMemoryHall.deactivate();
      }
      return false;
    } finally {
      _entering = false;
      document.body.classList.remove('living-world-entering');
    }
  }

  async function exitMemoryHall() {
    if (_activeWorld !== 'memory_hall' || _exiting) return false;
    if (!window.ChildMemoryHall || typeof window.ChildMemoryHall.deactivate !== 'function') {
      return false;
    }

    const skattView = document.getElementById('skattkammarView');
    const rewardsView = document.getElementById('rewardsView');

    _exiting = true;
    document.body.classList.add('living-world-exiting');
    document.body.classList.remove('living-world-active');

    try {
      if (skattView) skattView.classList.add('lw-portal-zoom-out');
      portalOverlay(true);
      await wait(THROUGH_MS);

      window.ChildMemoryHall.deactivate();
      if (skattView) skattView.classList.remove('lw-world-visible', 'lw-portal-zoom-out');

      let restored = false;
      if (window.ChildGarden && typeof window.ChildGarden.mount === 'function') {
        restored = await window.ChildGarden.mount(null, { viaTransition: true });
      }

      document.body.classList.add('living-world-through-reverse');
      if (skattView) skattView.classList.add('lw-portal-return');
      await wait(THROUGH_MS);

      document.body.classList.remove('living-world-through-reverse', 'living-world-chrome-out');
      if (rewardsView) rewardsView.classList.remove('living-world-rewards-shell');
      if (skattView) skattView.classList.remove('lw-portal-return');
      clearPortal();
      await wait(CHROME_MS);

      _active = restored;
      _activeWorld = restored ? 'garden' : null;
      return restored;
    } catch (err) {
      console.warn('[living-world] exit memory hall failed:', err && err.message);
      resetEnterClasses(null);
      _active = false;
      _activeWorld = null;
      return false;
    } finally {
      _exiting = false;
      document.body.classList.remove('living-world-exiting');
    }
  }

  function isActive() {
    return _active;
  }

  function activeWorld() {
    return _activeWorld;
  }

  function isTransitioning() {
    return _entering || _exiting;
  }

  window.LivingWorldTransition = {
    enterGarden: enterGarden,
    exitGarden: exitGarden,
    enterMemoryHall: enterMemoryHall,
    exitMemoryHall: exitMemoryHall,
    isActive: isActive,
    activeWorld: activeWorld,
    isTransitioning: isTransitioning,
    CHROME_MS: CHROME_MS,
    DOOR_MS: DOOR_MS,
    THROUGH_MS: THROUGH_MS,
    REVEAL_MS: REVEAL_MS,
  };
})();
