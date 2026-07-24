/**
 * child-worlds.js — Barnnav: legacy tre världar eller Barnets samling (fem flikar).
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
    {
      id: 'settings',
      icon: '⭐',
      href: '/child/settings',
      tabKey: 'settings',
      labels: { default: 'Mitt' },
      paths: ['/child/settings'],
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
    settings: 'settings',
    inställningar: 'settings',
    installningar: 'settings',
    mitt: 'settings',
    more: 'settings',
    mer: 'settings',
  };

  let _barnetsSamling = false;
  let _configured = false;

  function isBarnetsSamlingEnabled() {
    return _barnetsSamling;
  }

  /** Barn-UI: legacy hub-flik (gate av) vs samling (gate på). */
  function navCopy(key, fallback) {
    return (typeof window.cpt === 'function') ? cpt(key) : fallback;
  }

  function worldTabLabel() {
    return _barnetsSamling
      ? navCopy('nav.myCollection', 'Min samling')
      : navCopy('nav.myWorld', 'Min värld');
  }

  function worldBackLabel() {
    return _barnetsSamling
      ? navCopy('nav.backToCollection', 'Tillbaka till Min samling')
      : navCopy('nav.backToWorld', 'Tillbaka till Min värld');
  }

  function worldBackShort() {
    return worldTabLabel();
  }

  function worldHubSubcopy() {
    return _barnetsSamling
      ? navCopy('nav.worldHubSubcopySamling', 'Vad vill du göra här?')
      : navCopy('nav.worldHubSubcopyLegacy', 'Vad vill du göra i din värld?');
  }

  function analyticsNavMode() {
    return _barnetsSamling ? 'barnets_samling' : 'legacy';
  }

  /** Gate ON: WorldHub/Morgonhus får inte vara ingång till barnflödet (#590). */
  function isWorldHubEntryDisabled() {
    return _barnetsSamling;
  }

  function deactivateWorldSubScenes() {
    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.deactivate === 'function') {
      window.ChildMorgonhus.deactivate();
    }
    if (window.ChildWorldHub && typeof window.ChildWorldHub.deactivate === 'function') {
      window.ChildWorldHub.deactivate();
    }
    if (window.ChildGarden && typeof window.ChildGarden.deactivate === 'function') {
      window.ChildGarden.deactivate();
    }
    if (window.ChildMemoryHall && typeof window.ChildMemoryHall.deactivate === 'function') {
      window.ChildMemoryHall.deactivate();
    }
    document.body.classList.remove(
      'child-morgonhus-active',
      'child-world-hub-active',
      'child-garden-active',
      'child-memory-hall-active',
      'child-wayfinder-active'
    );
  }

  function syncTreasurePath() {
    if (typeof window === 'undefined' || !window.location) return;
    if (!isWorldHubEntryDisabled()) return;
    const target = '/child/treasure';
    const current = normalizePath(window.location.pathname);
    if (current !== target && current.indexOf('/child/') === 0) {
      const next = target + (window.location.hash || '');
      history.replaceState(null, '', next);
    }
  }

  /** Safe route när gate är på: Skattkammaren direkt, ingen hub. */
  async function exitToTreasureRoute() {
    deactivateWorldSubScenes();
    syncTreasurePath();
    if (typeof window.showTab === 'function') {
      window.showTab('rewards');
    }
    if (window.ChildTreasureView && typeof ChildTreasureView.refresh === 'function') {
      window.rewardsLoaded = false;
      await ChildTreasureView.refresh({ force: true });
    } else if (typeof window.loadRewards === 'function') {
      window.rewardsLoaded = false;
      await window.loadRewards({ force: true, skipHub: true });
    }
    return true;
  }

  /** Back/exit från Skattkammaren → Idag när gate är på (#591). */
  async function exitFromTreasureRoute() {
    if (!isWorldHubEntryDisabled()) {
      return remountWorldHubLegacy();
    }
    deactivateWorldSubScenes();
    if (typeof window.showTab === 'function') {
      window.showTab('schedule');
    }
    syncChildRoute('today');
    return true;
  }

  /** Legacy back: Morgonhus → WorldHub → Skattkammaren. */
  async function remountWorldHubLegacy() {
    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.tryMountWorld === 'function') {
      const remounted = await window.ChildMorgonhus.tryMountWorld();
      if (remounted) return true;
      if (typeof window.ChildMorgonhus.tryRemountCached === 'function'
          && window.ChildMorgonhus.tryRemountCached()) {
        return true;
      }
    }
    if (window.ChildWorldHub && typeof window.ChildWorldHub.show === 'function') {
      const hubShown = await window.ChildWorldHub.show();
      if (hubShown) return true;
    }
    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.openSkattkammaren === 'function') {
      window.ChildMorgonhus.openSkattkammaren();
      return true;
    }
    if (typeof window.loadRewards === 'function') {
      window.rewardsLoaded = false;
      await window.loadRewards();
    }
    return false;
  }

  /** Back/exit från sub-scenes — gate-aware (#590). */
  async function returnFromWorldSubScene() {
    if (isWorldHubEntryDisabled()) {
      return exitToTreasureRoute();
    }
    return remountWorldHubLegacy();
  }

  function treasureCanonicalPath() {
    return _barnetsSamling ? '/child/treasure' : '/child/world';
  }

  function hashForWorld(worldId) {
    if (_barnetsSamling) {
      const map = {
        today: 'today',
        collection: 'collection',
        treasure: 'treasure',
        family: 'family',
        settings: 'settings',
      };
      return map[worldId] || 'today';
    }
    const legacy = { today: 'today', world: 'universe', family: 'family' };
    return legacy[worldId] || 'today';
  }

  function worldRoutePath(worldId) {
    const w = worldById(worldId);
    return (w && w.href) ? w.href : '/child/today';
  }

  /** Synka pathname + hash till canonical barn-route (#591). */
  function syncChildRoute(worldId, opts) {
    if (typeof window === 'undefined' || !worldId) return;
    opts = opts || {};
    const world = worldById(worldId);
    if (!world) return;

    const path = (world.href || '/child/today').replace(/\/$/, '');
    const hash = '#' + hashForWorld(worldId);
    const onChildPath = window.location.pathname.indexOf('/child/') === 0
      || normalizePath(window.location.pathname) === '/child-dashboard';

    if (_barnetsSamling && normalizePath(window.location.pathname) === '/child/world') {
      window.location.replace(path + hash);
      return;
    }

    if (!onChildPath) return;

    const want = path + hash;
    const have = normalizePath(window.location.pathname) + window.location.hash;
    if (have === want) return;

    const historyFn = opts.push ? 'pushState' : 'replaceState';
    if (window.history && typeof window.history[historyFn] === 'function') {
      window.history[historyFn](null, '', want);
    }
  }

  /** Rensa hub/sub-scenes innan Skattkammaren visas (gate ON, #591). */
  function prepareTreasureEntry() {
    if (!isWorldHubEntryDisabled()) return;
    deactivateWorldSubScenes();
    document.body.classList.remove(
      'living-world-active',
      'living-world-entering',
      'living-world-exiting',
      'living-world-rewards-shell'
    );
    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.clearPreferSkatt === 'function') {
      window.ChildMorgonhus.clearPreferSkatt();
    }
  }

  function shouldSkipHubForRewards() {
    return isWorldHubEntryDisabled();
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

  function finishAppBoot() {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.remove('child-app-boot');
    const header = document.getElementById('childMainHeader');
    if (header) header.style.removeProperty('visibility');
  }

  function hideSamlingHeaderActions() {
    ['switchChildBtn', 'logoutBtn', 'childSystemIconBtn'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const menu = document.getElementById('childSystemMenu');
    if (menu) menu.classList.add('hidden');
  }

  function applySamlingChromeEarly() {
    if (typeof document === 'undefined' || !_barnetsSamling) return;
    hideSamlingHeaderActions();
    document.body.classList.add('child-worlds-v2', 'child-has-bottom-nav');
    const legacyNav = document.getElementById('childLayerNav');
    if (legacyNav) {
      legacyNav.classList.add('hidden');
      legacyNav.setAttribute('aria-hidden', 'true');
    }
    const home = document.getElementById('tabHome');
    const more = document.getElementById('tabMore');
    if (home) home.style.display = 'none';
    if (more) more.style.display = 'none';
    const homeView = document.getElementById('homeView');
    const moreView = document.getElementById('moreView');
    if (homeView) homeView.classList.add('hidden');
    if (moreView) moreView.classList.add('hidden');
    if (window.ChildWorldsNav && typeof ChildWorldsNav.renderBottomNav === 'function') {
      ChildWorldsNav.renderBottomNav();
    }
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
      finishAppBoot();
      if (_barnetsSamling) {
        applySamlingChromeEarly();
      }
      document.dispatchEvent(new CustomEvent('child-worlds-configured'));
      if (_barnetsSamling) {
        const p = normalizePath(window.location.pathname);
        if (p === '/child/world') {
          window.location.replace('/child/treasure' + (window.location.hash || ''));
        }
      } else {
        const pOff = normalizePath(window.location.pathname);
        if (pOff === '/child/treasure') {
          window.location.replace('/child/world' + (window.location.hash || ''));
        }
      }
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
    const NAV_I18N = {
      today: { young: 'nav.todayYoung', default: 'nav.today', personal: 'nav.todayPersonal' },
      world: { default: 'nav.myWorld' },
      collection: { default: 'nav.myCollection' },
      treasure: { default: 'nav.treasureChest' },
      family: { default: 'nav.myPeople' },
      settings: { default: 'nav.mySpace' },
    };
    let raw;
    const i18nKeys = NAV_I18N[world.id];
    if (i18nKeys && typeof window.cpt === 'function') {
      if (ctx.ageBand === 'young' && i18nKeys.young) raw = cpt(i18nKeys.young);
      else if (ctx.childName && i18nKeys.personal) raw = cpt(i18nKeys.personal, { name: ctx.childName });
      else if (i18nKeys.default) raw = cpt(i18nKeys.default);
    }
    if (!raw) {
      if (ctx.ageBand === 'young' && labels.young) raw = labels.young;
      else if (ctx.childName && labels.personal) {
        raw = labels.personal.replace('{name}', ctx.childName);
      } else {
        raw = labels.default || world.id;
      }
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
    worldTabLabel: worldTabLabel,
    worldBackLabel: worldBackLabel,
    worldBackShort: worldBackShort,
    worldHubSubcopy: worldHubSubcopy,
    analyticsNavMode: analyticsNavMode,
    isWorldHubEntryDisabled: isWorldHubEntryDisabled,
    deactivateWorldSubScenes: deactivateWorldSubScenes,
    syncTreasurePath: syncTreasurePath,
    exitToTreasureRoute: exitToTreasureRoute,
    exitFromTreasureRoute: exitFromTreasureRoute,
    remountWorldHubLegacy: remountWorldHubLegacy,
    returnFromWorldSubScene: returnFromWorldSubScene,
    treasureCanonicalPath: treasureCanonicalPath,
    hashForWorld: hashForWorld,
    worldRoutePath: worldRoutePath,
    syncChildRoute: syncChildRoute,
    prepareTreasureEntry: prepareTreasureEntry,
    shouldSkipHubForRewards: shouldSkipHubForRewards,
    configureFromFeatures: configureFromFeatures,
    finishAppBoot: finishAppBoot,
  };
})();
