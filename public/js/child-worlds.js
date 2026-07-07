/**
 * child-worlds.js — Barnnav: legacy tre världar eller Barnets samling (fyra flikar).
 * Gate: barnets_samling via ChildWorlds.configureFromFeatures().
 * Consumers: child-shell.js, child-worlds-nav.js, child-layer-router.js
 */
(function () {
  'use strict';

  const V2_ENABLED = true;
  const FEATURE_SLUG = 'barnets_samling';

  const LEGACY_WORLDS = [
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

  const SAMLING_WORLDS = [
    {
      id: 'today',
      icon: '☀️',
      href: '/child/today',
      tabKey: 'schedule',
      labels: { young: 'Uppdrag', default: 'Idag', personal: '{name}s dag' },
      paths: ['/child/today', '/child-dashboard'],
    },
    {
      id: 'collection',
      icon: '🏆',
      href: '/child/collection',
      tabKey: 'collection',
      labels: { default: 'Min samling' },
      paths: ['/child/collection'],
    },
    {
      id: 'treasure',
      icon: '🎁',
      href: '/child/treasure',
      tabKey: 'rewards',
      labels: { default: 'Skattkammaren' },
      paths: ['/child/treasure'],
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

  const LEGACY_HASH = {
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

  const SAMLING_HASH = {
    today: 'today',
    idag: 'today',
    schedule: 'today',
    home: 'today',
    hem: 'today',
    collection: 'collection',
    samling: 'collection',
    universe: 'treasure',
    rewards: 'treasure',
    skattkammaren: 'treasure',
    skatt: 'treasure',
    treasure: 'treasure',
    world: 'treasure',
    family: 'family',
    familj: 'family',
    more: 'today',
    mer: 'today',
  };

  let _barnetsSamling = false;
  let _configured = false;

  function isBarnetsSamlingEnabled() {
    return _barnetsSamling;
  }

  function isConfigured() {
    return _configured;
  }

  function getChildWorlds() {
    return _barnetsSamling ? SAMLING_WORLDS : LEGACY_WORLDS;
  }

  function getHashMap() {
    return _barnetsSamling ? SAMLING_HASH : LEGACY_HASH;
  }

  function configureFromFeatures(features) {
    const list = features || [];
    _barnetsSamling = list.some(function (f) {
      return f && f.slug === FEATURE_SLUG;
    });
    _configured = true;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute(
        'data-barnets-samling',
        _barnetsSamling ? 'on' : 'off'
      );
      document.dispatchEvent(new CustomEvent('child-worlds-configured'));
    }
  }

  function normalizePath(pathname) {
    let p = (pathname || '/').replace(/\/$/, '') || '/';
    if (p.endsWith('.html')) p = p.slice(0, -5);
    return p;
  }

  function worldById(id) {
    const list = getChildWorlds();
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function tabKeyToWorldId(tabKey) {
    if (tabKey === 'home' || tabKey === 'more') return 'today';
    const list = getChildWorlds();
    for (let i = 0; i < list.length; i++) {
      if (list[i].tabKey === tabKey) return list[i].id;
    }
    return 'today';
  }

  function worldIdToTabKey(worldId) {
    const w = worldById(worldId);
    return w ? w.tabKey : 'schedule';
  }

  function activeChildNavItem(pathname, hash, nav) {
    const list = nav || getChildWorlds();
    const p = normalizePath(pathname);
    const h = (hash || '').replace(/^#/, '').toLowerCase();
    const hashMap = getHashMap();

    if ((p === '/child-dashboard' || p.indexOf('/child/today') === 0) && h && hashMap[h]) {
      return worldById(hashMap[h]);
    }

    if (_barnetsSamling && p === '/child/world') {
      return worldById('treasure');
    }

    for (let i = 0; i < list.length; i++) {
      const tab = list[i];
      if (!tab.paths) continue;
      for (let j = 0; j < tab.paths.length; j++) {
        const tp = tab.paths[j];
        if (p === tp) return tab;
        if (tp === '/child-dashboard' && p.indexOf('/child-dashboard') === 0) return tab;
        if (tp !== '/' && p.indexOf(tp + '/') === 0) return tab;
      }
    }
    return list[0] || null;
  }

  function labelForWorld(world, context) {
    if (!world) return '';
    const ctx = context || {};
    const labels = world.labels || {};
    let raw;
    if (ctx.ageBand === 'young' && labels.young) raw = labels.young;
    else if (ctx.childName && labels.personal) {
      raw = labels.personal.replace('{name}', ctx.childName);
    } else {
      raw = labels.default || world.id;
    }
    if (typeof window.escHtml === 'function') return window.escHtml(raw);
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(raw);
    const d = document.createElement('div');
    d.textContent = raw || '';
    return d.innerHTML;
  }

  window.ChildWorlds = {
    V2_ENABLED: V2_ENABLED,
    FEATURE_SLUG: FEATURE_SLUG,
    LEGACY_WORLDS: LEGACY_WORLDS,
    SAMLING_WORLDS: SAMLING_WORLDS,
    /** @deprecated use getChildWorlds() */
    get CHILD_WORLDS() { return getChildWorlds(); },
    get HASH_TO_WORLD() { return getHashMap(); },
    normalizePath: normalizePath,
    worldById: worldById,
    tabKeyToWorldId: tabKeyToWorldId,
    worldIdToTabKey: worldIdToTabKey,
    activeChildNavItem: activeChildNavItem,
    labelForWorld: labelForWorld,
    getChildWorlds: getChildWorlds,
    isBarnetsSamlingEnabled: isBarnetsSamlingEnabled,
    isConfigured: isConfigured,
    configureFromFeatures: configureFromFeatures,
  };
})();
