/**
 * child-worlds.js — Single source of truth for barnmeny v2 (three primary worlds).
 * Consumers: child-shell.js, child-worlds-nav.js, child-layer-router.js, session-gate.js
 */
(function () {
  'use strict';

  var V2_ENABLED = true;

  var CHILD_WORLDS = [
    {
      id: 'today',
      icon: '☀️',
      href: '/child/today',
      tabKey: 'schedule',
      labels: { young: 'Uppdrag', default: 'Idag', personal: '{name}s dag' },
      paths: ['/child/today', '/child-dashboard'],
    },
    {
      id: 'world',
      icon: '🏰',
      href: '/child/world',
      tabKey: 'rewards',
      labels: { default: 'Min värld' },
      paths: ['/child/world'],
    },
    {
      id: 'family',
      icon: '❤️',
      href: '/child/family',
      tabKey: 'family',
      labels: { default: 'Mina personer' },
      paths: ['/child/family'],
    },
  ];

  var HASH_TO_WORLD = {
    today: 'today',
    idag: 'today',
    schedule: 'today',
    home: 'today',
    hem: 'today',
    universe: 'world',
    rewards: 'world',
    skattkammaren: 'world',
    world: 'world',
    family: 'family',
    familj: 'family',
    more: 'today',
    mer: 'today',
  };

  function normalizePath(pathname) {
    var p = (pathname || '/').replace(/\/$/, '') || '/';
    if (p.endsWith('.html')) p = p.slice(0, -5);
    return p;
  }

  function worldById(id) {
    for (var i = 0; i < CHILD_WORLDS.length; i++) {
      if (CHILD_WORLDS[i].id === id) return CHILD_WORLDS[i];
    }
    return null;
  }

  function tabKeyToWorldId(tabKey) {
    if (tabKey === 'home' || tabKey === 'more') return 'today';
    for (var i = 0; i < CHILD_WORLDS.length; i++) {
      if (CHILD_WORLDS[i].tabKey === tabKey) return CHILD_WORLDS[i].id;
    }
    return 'today';
  }

  function worldIdToTabKey(worldId) {
    var w = worldById(worldId);
    return w ? w.tabKey : 'schedule';
  }

  function activeChildNavItem(pathname, hash, nav) {
    var list = nav || CHILD_WORLDS;
    var p = normalizePath(pathname);
    var h = (hash || '').replace(/^#/, '').toLowerCase();

    if ((p === '/child-dashboard' || p.indexOf('/child/today') === 0) && h && HASH_TO_WORLD[h]) {
      return worldById(HASH_TO_WORLD[h]);
    }

    for (var i = 0; i < list.length; i++) {
      var tab = list[i];
      if (!tab.paths) continue;
      for (var j = 0; j < tab.paths.length; j++) {
        var tp = tab.paths[j];
        if (p === tp) return tab;
        if (tp === '/child-dashboard' && p.indexOf('/child-dashboard') === 0) return tab;
        if (tp !== '/' && p.indexOf(tp + '/') === 0) return tab;
      }
    }
    return list[0] || null;
  }

  function labelForWorld(world, context) {
    if (!world) return '';
    var ctx = context || {};
    var labels = world.labels || {};
    if (ctx.ageBand === 'young' && labels.young) return labels.young;
    if (ctx.childName && labels.personal) {
      return labels.personal.replace('{name}', ctx.childName);
    }
    return labels.default || world.id;
  }

  window.ChildWorlds = {
    V2_ENABLED: V2_ENABLED,
    CHILD_WORLDS: CHILD_WORLDS,
    HASH_TO_WORLD: HASH_TO_WORLD,
    normalizePath: normalizePath,
    worldById: worldById,
    tabKeyToWorldId: tabKeyToWorldId,
    worldIdToTabKey: worldIdToTabKey,
    activeChildNavItem: activeChildNavItem,
    labelForWorld: labelForWorld,
  };
})();
