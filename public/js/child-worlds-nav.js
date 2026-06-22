/**
 * child-worlds-nav.js — Renders barnmeny v2 three-world nav (Sprint 1).
 */
(function () {
  'use strict';

  if (!window.ChildWorlds || !ChildWorlds.V2_ENABLED) return;

  var NAV_BTN_CLASS = 'child-bottom-nav-btn';
  var LEGACY_BTN_CLASS = 'flex-1 py-3 text-sm font-semibold border-b-2';

  function labelContext() {
    var nameEl = document.getElementById('childName');
    return { childName: nameEl ? nameEl.textContent : '' };
  }

  function renderBottomNav() {
    var nav = document.getElementById('childBottomNav');
    if (!nav) return;

    var active = ChildWorlds.activeChildNavItem(
      window.location.pathname,
      window.location.hash
    );
    var activeId = active ? active.id : 'today';
    var ctx = labelContext();

    var html = '';
    ChildWorlds.CHILD_WORLDS.forEach(function (world) {
      var isActive = world.id === activeId;
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
        '<span class="child-bottom-nav-icon" aria-hidden="true">' +
        world.icon +
        '</span>' +
        '<span>' +
        ChildWorlds.labelForWorld(world, ctx) +
        '</span></button>';
    });

    nav.innerHTML = html;
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Barnnavigering');
    nav.style.display = '';

    nav.querySelectorAll('[data-child-world]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var worldId = btn.getAttribute('data-child-world');
        navigateWorld(worldId);
      });
    });
  }

  function renderLegacyTopNav() {
    var legacy = document.getElementById('childLayerNav');
    if (!legacy) return;

    var active = ChildWorlds.activeChildNavItem(
      window.location.pathname,
      window.location.hash
    );
    var activeId = active ? active.id : 'today';
    var ctx = labelContext();

    var inner =
      '<div class="flex max-w-lg mx-auto" role="navigation" aria-label="Barnnavigering">';
    ChildWorlds.CHILD_WORLDS.forEach(function (world) {
      var isActive = world.id === activeId;
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
    var tabKey = ChildWorlds.worldIdToTabKey(worldId);
    var world = ChildWorlds.worldById(worldId);
    if (world && world.href && window.location.pathname.indexOf('/child/') === 0) {
      if (window.location.pathname !== world.href.replace(/\/$/, '')) {
        window.location.href = world.href;
        return;
      }
    }
    if (typeof window.showTab === 'function') {
      window.showTab(tabKey);
    }
  }

  function applyV2Chrome() {
    var home = document.getElementById('tabHome');
    var more = document.getElementById('tabMore');
    if (home) home.style.display = 'none';
    if (more) more.style.display = 'none';

    var homeView = document.getElementById('homeView');
    var moreView = document.getElementById('moreView');
    if (homeView) homeView.classList.add('hidden');
    if (moreView) moreView.classList.add('hidden');

    document.body.classList.add('child-worlds-v2');
    document.body.classList.add('child-has-bottom-nav');
  }

  function highlightActive(tabKey) {
    var worldId = ChildWorlds.tabKeyToWorldId(tabKey);
    var nav = document.getElementById('childBottomNav');
    if (!nav) return;
    nav.querySelectorAll('[data-child-world]').forEach(function (btn) {
      var active = btn.getAttribute('data-child-world') === worldId;
      btn.classList.toggle('is-active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }

  function init() {
    applyV2Chrome();
    renderBottomNav();
    renderLegacyTopNav();
  }

  window.ChildWorldsNav = {
    init: init,
    navigateWorld: navigateWorld,
    highlightActive: highlightActive,
    renderBottomNav: renderBottomNav,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
