/**
 * child-layer-router.js — 4-layer route isolation (Home / Today / Universe / Family+More).
 * Separation contract: no cross-layer UI on wrong route.
 */
(function () {
  'use strict';

  var LAYERS = {
    home: { tab: 'home', hash: 'home', label: '🏠 Hem' },
    today: { tab: 'schedule', hash: 'today', label: '📅 Schema' },
    universe: { tab: 'rewards', hash: 'universe', label: '💎 Skattkammaren' },
    family: { tab: 'family', hash: 'family', label: '🏡 Familj' },
    more: { tab: 'more', hash: 'more', label: '⋯ Mer' },
  };

  var TAB_TO_LAYER = {
    home: 'home',
    schedule: 'today',
    rewards: 'universe',
    family: 'family',
    more: 'more',
  };

  var HASH_ALIASES = {
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

  var _currentLayer = 'home';
  var _originalShowTab = null;

  function layerFromHash() {
    var raw = (window.location.hash || '').replace(/^#/, '').toLowerCase();
    if (!raw) return null;
    return HASH_ALIASES[raw] || null;
  }

  function setHash(layer) {
    var entry = LAYERS[layer];
    if (!entry) return;
    var target = '#' + entry.hash;
    if (window.location.hash !== target) {
      history.replaceState(null, '', target);
    }
  }

  function applyRouteGuards(layer) {
    _currentLayer = layer;
    document.documentElement.setAttribute('data-child-layer', layer);

    var scheduleView = document.getElementById('scheduleView');
    var todayFocus = document.getElementById('todayFocusMount');
    var rewardsView = document.getElementById('rewardsView');
    var familyView = document.getElementById('familyView');
    var homeView = document.getElementById('homeView');

    if (layer === 'today' && todayFocus && window.ChildTodayFocus) {
      ChildTodayFocus.onTabChange('schedule');
    }

    if (layer === 'universe' && scheduleView) {
      scheduleView.setAttribute('data-layer-hidden', 'true');
    } else if (scheduleView) {
      scheduleView.removeAttribute('data-layer-hidden');
    }

    if (familyView) {
      familyView.setAttribute('data-active', layer === 'family' ? 'true' : 'false');
    }

    if (homeView) {
      homeView.setAttribute('data-active', layer === 'home' ? 'true' : 'false');
    }

    if (layer === 'family' && window.ChildFamilyHall) {
      ChildFamilyHall.refresh();
    }
  }

  function highlightTab(tab) {
    var map = {
      home: 'tabHome',
      schedule: 'tabSchedule',
      rewards: 'tabRewards',
      more: 'tabMore',
      family: 'tabMore',
    };
    Object.keys({ home: 1, schedule: 1, rewards: 1, more: 1 }).forEach(function (key) {
      var el = document.getElementById(map[key] || key);
      if (!el) return;
      el.classList.toggle('is-active', map[tab] === map[key]);
    });
  }

  function onTabShown(tab) {
    var layer = TAB_TO_LAYER[tab] || 'home';
    setHash(layer);
    applyRouteGuards(layer);
    highlightTab(tab);

    if (tab === 'schedule' && window.ChildTodayFocus) {
      ChildTodayFocus.onTabChange('schedule');
    } else if (tab === 'home' && window.ChildTodayFocus) {
      ChildTodayFocus.onTabChange('home');
    } else if (window.ChildTodayFocus) {
      ChildTodayFocus.onTabChange(tab);
    }
  }

  function navigateToLayer(layer) {
    var entry = LAYERS[layer];
    if (!entry || typeof window.showTab !== 'function') return;
    window.showTab(entry.tab);
  }

  function init() {
    if (typeof window.showTab !== 'function') return;
    _originalShowTab = window.showTab;
    window.showTab = function (tab) {
      _originalShowTab(tab);
      onTabShown(tab);
    };

    window.addEventListener('hashchange', function () {
      var layer = layerFromHash();
      if (layer) navigateToLayer(layer);
    });

    var initial = layerFromHash();
    if (initial) {
      navigateToLayer(initial);
    } else {
      window.showTab('home');
    }
  }

  window.ChildLayerRouter = {
    init: init,
    navigateToLayer: navigateToLayer,
    getCurrentLayer: function () { return _currentLayer; },
    LAYERS: LAYERS,
  };
})();
