/**
 * child-layer-router.js — Hash/route → child world (barnmeny v2).
 */
(function () {
  'use strict';

  const useV2 = !!(window.ChildWorlds && ChildWorlds.V2_ENABLED);

  const LAYERS = {
    home: { tab: 'home', hash: 'home', label: '🏠 Hem' },
    today: { tab: 'schedule', hash: 'today', label: '📅 Schema' },
    universe: { tab: 'rewards', hash: 'universe', label: '💎 Skattkammaren' },
    family: { tab: 'family', hash: 'family', label: '🏡 Familj' },
    more: { tab: 'more', hash: 'more', label: '⋯ Mer' },
  };

  const TAB_TO_LAYER = {
    home: 'home',
    schedule: 'today',
    rewards: 'universe',
    family: 'family',
    more: 'more',
  };

  const HASH_ALIASES = useV2 && window.ChildWorlds
    ? ChildWorlds.HASH_TO_WORLD
    : {
        home: 'home',
        hem: 'home',
        today: 'today',
        schedule: 'today',
        idag: 'today',
        universe: 'universe',
        rewards: 'universe',
        skattkammaren: 'universe',
        family: 'family',
        familj: 'family',
        more: 'more',
        mer: 'more',
      };

  let _currentLayer = 'today';
  let _originalShowTab = null;

  function layerFromHash() {
    const raw = (window.location.hash || '').replace(/^#/, '').toLowerCase();
    if (!raw) return null;
    if (useV2 && ChildWorlds.HASH_TO_WORLD[raw]) {
      return ChildWorlds.HASH_TO_WORLD[raw];
    }
    return HASH_ALIASES[raw] || null;
  }

  function worldToTab(layerOrWorld) {
    if (useV2 && ChildWorlds.worldIdToTabKey) {
      return ChildWorlds.worldIdToTabKey(layerOrWorld);
    }
    const entry = LAYERS[layerOrWorld];
    return entry ? entry.tab : 'schedule';
  }

  function setHash(layerOrWorld) {
    if (useV2) {
      const hashKey = window.ChildWorlds && ChildWorlds.hashForWorld
        ? ChildWorlds.hashForWorld(layerOrWorld)
        : ({
          today: 'today',
          collection: 'collection',
          treasure: 'universe',
          world: 'universe',
          family: 'family',
          settings: 'settings',
        }[layerOrWorld] || 'today');
      const target = '#' + hashKey;
      if (window.location.hash !== target) {
        history.replaceState(null, '', target);
      }
      return;
    }
    const entry = LAYERS[layerOrWorld];
    if (!entry) return;
    const targetLegacy = '#' + entry.hash;
    if (window.location.hash !== targetLegacy) {
      history.replaceState(null, '', targetLegacy);
    }
  }

  function applyRouteGuards(layerOrWorld) {
    _currentLayer = layerOrWorld;
    document.documentElement.setAttribute('data-child-layer', layerOrWorld);
    document.documentElement.setAttribute('data-child-world', layerOrWorld);

    const scheduleView = document.getElementById('scheduleView');
    const todayFocus = document.getElementById('todayFocusMount');
    const rewardsView = document.getElementById('rewardsView');
    const familyView = document.getElementById('familyView');
    const settingsView = document.getElementById('settingsView');
    const homeView = document.getElementById('homeView');

    const isToday = layerOrWorld === 'today' || layerOrWorld === 'home';
    const isWorld = layerOrWorld === 'world' || layerOrWorld === 'universe' || layerOrWorld === 'treasure';
    const isCollection = layerOrWorld === 'collection';
    const isFamily = layerOrWorld === 'family';
    const isSettings = layerOrWorld === 'settings';

    const collectionView = document.getElementById('collectionView');
    if (collectionView) {
      collectionView.setAttribute('data-active', isCollection ? 'true' : 'false');
    }

    const hideIdagChrome = isWorld || isCollection || isFamily || isSettings;

    if (scheduleView) {
      if (hideIdagChrome) {
        scheduleView.setAttribute('data-layer-hidden', 'true');
      } else {
        scheduleView.removeAttribute('data-layer-hidden');
      }
    }

    if (todayFocus) {
      todayFocus.classList.toggle('hidden', hideIdagChrome);
    }

    if (isToday && todayFocus && window.ChildTodayFocus) {
      ChildTodayFocus.onTabChange('schedule');
    } else if (hideIdagChrome && window.ChildTodayFocus) {
      ChildTodayFocus.onTabChange(layerOrWorld);
    }

    if (familyView) {
      familyView.setAttribute('data-active', isFamily ? 'true' : 'false');
    }

    if (settingsView) {
      settingsView.setAttribute('data-active', isSettings ? 'true' : 'false');
    }

    if (homeView) {
      homeView.setAttribute('data-active', 'false');
    }

    if (isFamily && window.ChildFamilyHall) {
      ChildFamilyHall.refresh();
    }
    if (isSettings && window.ChildSettingsView) {
      ChildSettingsView.refresh();
    }
  }

  function onTabShown(tab) {
    const layer = useV2 ? ChildWorlds.tabKeyToWorldId(tab) : TAB_TO_LAYER[tab] || 'today';
    setHash(layer);
    applyRouteGuards(layer);

    if (useV2 && window.ChildWorlds && ChildWorlds.syncChildRoute) {
      ChildWorlds.syncChildRoute(layer);
    }

    if (window.ChildWorldsNav) ChildWorldsNav.highlightActive(tab);

    if (tab === 'schedule' && window.ChildTodayFocus) {
      ChildTodayFocus.onTabChange('schedule');
    } else if (window.ChildTodayFocus) {
      ChildTodayFocus.onTabChange(tab);
    }
  }

  function navigateToLayer(layerOrWorld) {
    if (useV2 && layerOrWorld === 'home') layerOrWorld = 'today';
    if (!useV2 && layerOrWorld === 'home' && window.AppViewMode && !AppViewMode.isMagic()) {
      layerOrWorld = 'today';
    }
    const tab = worldToTab(layerOrWorld);
    if (typeof window.showTab !== 'function') return;
    window.showTab(tab);
  }

  function init() {
    if (typeof window.showTab !== 'function') return;
    _originalShowTab = window.showTab;
    window.showTab = function (tab) {
      if (useV2) {
        if (tab === 'home' || tab === 'more') tab = 'schedule';
      }
      _originalShowTab(tab);
      onTabShown(tab);
    };

    window.addEventListener('hashchange', function () {
      const layer = layerFromHash();
      if (layer) navigateToLayer(layer);
    });

    window.addEventListener('popstate', function () {
      if (!useV2 || !ChildWorlds.isBarnetsSamlingEnabled || !ChildWorlds.isBarnetsSamlingEnabled()) {
        return;
      }
      const active = ChildWorlds.activeChildNavItem(
        window.location.pathname,
        window.location.hash
      );
      if (!active) return;
      if (active.id === 'treasure' && typeof window.showTab === 'function') {
        if (ChildWorlds.prepareTreasureEntry) ChildWorlds.prepareTreasureEntry();
        window.showTab('rewards');
        return;
      }
      navigateToLayer(active.id);
    });

    const pathWorld = useV2 && ChildWorlds.activeChildNavItem
      ? ChildWorlds.activeChildNavItem(window.location.pathname, window.location.hash)
      : null;

    if (pathWorld && window.location.pathname.indexOf('/child/') === 0) {
      if (ChildWorlds.isBarnetsSamlingEnabled && ChildWorlds.isBarnetsSamlingEnabled()
          && window.location.pathname.replace(/\/$/, '') === '/child/world') {
        window.location.replace('/child/treasure' + (window.location.hash || ''));
        return;
      }
      navigateToLayer(pathWorld.id);
      return;
    }

    if (useV2 && ChildWorlds.isBarnetsSamlingEnabled && ChildWorlds.isBarnetsSamlingEnabled()) {
      const dashPath = window.location.pathname.replace(/\/$/, '');
      if (dashPath === '/child-dashboard') {
        const hashLayer = layerFromHash();
        if (hashLayer === 'treasure' || hashLayer === 'world') {
          window.location.replace('/child/treasure' + (window.location.hash || '#treasure'));
          return;
        }
      }
    }

    const initial = layerFromHash();
    if (initial) {
      navigateToLayer(initial);
    } else if (useV2) {
      window.showTab('schedule');
    } else if (window.AppViewMode && AppViewMode.isMagic()) {
      window.showTab('home');
    } else {
      window.showTab('schedule');
    }
  }

  window.ChildLayerRouter = {
    init: init,
    navigateToLayer: navigateToLayer,
    getCurrentLayer: function () {
      return _currentLayer;
    },
    LAYERS: LAYERS,
  };
})();
