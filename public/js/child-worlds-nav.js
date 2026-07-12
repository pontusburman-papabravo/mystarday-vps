/**
 * child-worlds-nav.js — Renders barnmeny v2 three-world nav (Sprint 1).
 */
(function () {
  'use strict';

  if (!window.ChildWorlds || !ChildWorlds.V2_ENABLED) return;

  const NAV_BTN_CLASS = 'child-bottom-nav-btn';
  const LEGACY_BTN_CLASS = 'flex-1 py-3 text-sm font-semibold border-b-2';
  let _initialized = false;

  function isFirstStarModeActive() {
    return !!(window.ChildFirstStarMode && ChildFirstStarMode.isActive());
  }

  function hideBottomNavForFirstStar() {
    const nav = document.getElementById('childBottomNav');
    if (nav) {
      nav.innerHTML = '';
      nav.style.setProperty('display', 'none', 'important');
      nav.setAttribute('aria-hidden', 'true');
    }

    const legacyNav = document.getElementById('childLayerNav');
    if (legacyNav) {
      legacyNav.style.setProperty('display', 'none', 'important');
      legacyNav.setAttribute('aria-hidden', 'true');
    }

    document.body.classList.remove('child-has-bottom-nav');
  }

  function labelContext() {
    const nameEl = document.getElementById('childName');
    return { childName: nameEl ? nameEl.textContent : '' };
  }

  function renderBottomNav() {
    const nav = document.getElementById('childBottomNav');
    if (!nav) return;

    if (isFirstStarModeActive()) {
      hideBottomNavForFirstStar();
      return;
    }

    nav.removeAttribute('data-nav-ready');

    const active = ChildWorlds.activeChildNavItem(
      window.location.pathname,
      window.location.hash
    );
    const activeId = active ? active.id : 'today';
    const ctx = labelContext();
    const worlds = ChildWorlds.getChildWorlds ? ChildWorlds.getChildWorlds() : ChildWorlds.CHILD_WORLDS;

    let html = '';
    const gateOn = ChildWorlds.isBarnetsSamlingEnabled && ChildWorlds.isBarnetsSamlingEnabled();
    const useThemeIcons = gateOn && window.ChildTheme && ChildTheme.iconHtmlForWorld;

    worlds.forEach(function (world) {
      const isActive = world.id === activeId;
      const iconMarkup = (useThemeIcons && world.id !== 'settings')
        ? ChildTheme.iconHtmlForWorld(world.id)
        : '<span class="child-bottom-nav-icon" aria-hidden="true">' + world.icon + '</span>';
      html +=
        '<button type="button" class="' +
        NAV_BTN_CLASS +
        (isActive ? ' is-active' : '') +
        '" data-child-world="' +
        world.id +
        '" data-tab-key="' +
        world.tabKey +
        '"' +
        (isActive ? ' aria-current="page"' : '') +
        '>' +
        iconMarkup +
        '<span>' +
        ChildWorlds.labelForWorld(world, ctx) +
        '</span></button>';
    });

    nav.innerHTML = html;
    nav.setAttribute('data-nav-ready', 'true');
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Barnnavigering');
    nav.style.display = '';
    nav.removeAttribute('aria-hidden');
    document.body.classList.add('child-has-bottom-nav');

    nav.querySelectorAll('.child-nav-icon-img').forEach(function (img) {
      img.addEventListener('error', function () {
        img.classList.add('is-broken');
      });
    });

    nav.querySelectorAll('[data-child-world]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const worldId = btn.getAttribute('data-child-world');
        navigateWorld(worldId);
      });
    });
  }

  function renderLegacyTopNav() {
    const legacy = document.getElementById('childLayerNav');
    if (!legacy) return;

    const active = ChildWorlds.activeChildNavItem(
      window.location.pathname,
      window.location.hash
    );
    const activeId = active ? active.id : 'today';
    const ctx = labelContext();
    const worlds = ChildWorlds.getChildWorlds ? ChildWorlds.getChildWorlds() : ChildWorlds.CHILD_WORLDS;

    let inner =
      '<div class="flex max-w-lg mx-auto" role="navigation" aria-label="Barnnavigering">';
    worlds.forEach(function (world) {
      const isActive = world.id === activeId;
      inner +=
        '<button type="button" class="' +
        LEGACY_BTN_CLASS +
        ' ' +
        (isActive ? 'text-navy border-gold font-semibold' : 'text-text-soft border-transparent') +
        '" data-child-world-legacy="' +
        world.id +
        '"' +
        (isActive ? ' aria-current="page"' : '') +
        '>' +
        world.icon +
        ' ' +
        ChildWorlds.labelForWorld(world, ctx) +
        '</button>';
    });
    inner += '</div>';
    legacy.innerHTML = inner;
    legacy.classList.add('hidden');
    legacy.setAttribute('aria-hidden', 'true');

    legacy.querySelectorAll('[data-child-world-legacy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        navigateWorld(btn.getAttribute('data-child-world-legacy'));
      });
    });
  }

  function navigateWorld(worldId) {
    const gateOn = ChildWorlds.isBarnetsSamlingEnabled && ChildWorlds.isBarnetsSamlingEnabled();
    if (gateOn && worldId === 'treasure') {
      const path = window.location.pathname.replace(/\/$/, '');
      if (path === '/child/world' || path !== '/child/treasure') {
        window.location.href = '/child/treasure';
        return;
      }
    }
    const tabKey = ChildWorlds.worldIdToTabKey(worldId);
    const world = ChildWorlds.worldById(worldId);
    if (world && world.href) {
      const targetPath = world.href.replace(/\/$/, '');
      const currentPath = window.location.pathname.replace(/\/$/, '');
      const onChildShell = window.location.pathname.indexOf('/child/') === 0
        || currentPath === '/child-dashboard';
      if (onChildShell && currentPath !== targetPath) {
        window.location.href = world.href;
        return;
      }
    }
    if (worldId === 'treasure' && gateOn && ChildWorlds.prepareTreasureEntry) {
      ChildWorlds.prepareTreasureEntry();
    }
    if (typeof window.showTab === 'function') {
      window.showTab(tabKey);
    }
    if (window.ChildWorlds && ChildWorlds.syncChildRoute) {
      ChildWorlds.syncChildRoute(worldId, { push: true });
    }
  }

  function applyV2Chrome() {
    const home = document.getElementById('tabHome');
    const more = document.getElementById('tabMore');
    if (home) home.style.display = 'none';
    if (more) more.style.display = 'none';

    const homeView = document.getElementById('homeView');
    const moreView = document.getElementById('moreView');
    if (homeView) homeView.classList.add('hidden');
    if (moreView) moreView.classList.add('hidden');

    document.body.classList.add('child-worlds-v2');
    if (!isFirstStarModeActive()) {
      document.body.classList.add('child-has-bottom-nav');
    }
  }

  function highlightActive(tabKey) {
    if (isFirstStarModeActive()) return;
    const worldId = ChildWorlds.tabKeyToWorldId(tabKey);
    const nav = document.getElementById('childBottomNav');
    if (!nav) return;
    nav.querySelectorAll('[data-child-world]').forEach(function (btn) {
      const active = btn.getAttribute('data-child-world') === worldId;
      btn.classList.toggle('is-active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }

  function init() {
    if (_initialized) {
      renderBottomNav();
      return;
    }
    _initialized = true;
    applyV2Chrome();
    renderBottomNav();
  }

  function syncFirstStarHide() {
    if (isFirstStarModeActive()) hideBottomNavForFirstStar();
  }

  window.ChildWorldsNav = {
    init: init,
    navigateWorld: navigateWorld,
    highlightActive: highlightActive,
    renderBottomNav: renderBottomNav,
    syncFirstStarHide: syncFirstStarHide,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (window.ChildWorlds && ChildWorlds.isConfigured && ChildWorlds.isConfigured()) {
        init();
      } else {
        document.addEventListener('child-worlds-configured', init, { once: true });
      }
    });
  } else if (window.ChildWorlds && ChildWorlds.isConfigured && ChildWorlds.isConfigured()) {
    init();
  } else {
    document.addEventListener('child-worlds-configured', init, { once: true });
  }
})();
