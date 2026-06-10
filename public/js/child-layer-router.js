/**
 * child-layer-router.js — 3-layer route isolation (Today / Universe / Family).
 * Separation contract: no cross-layer UI on wrong route.
 */
(function () {
  'use strict';

  var LAYERS = {
    today: { tab: 'schedule', hash: 'today', label: '☀️ Idag' },
    universe: { tab: 'rewards', hash: 'universe', label: '💎 Skattkammaren' },
    family: { tab: 'family', hash: 'family', label: '🏡 Familj' },
  };

  var TAB_TO_LAYER = {
    schedule: 'today',
    rewards: 'universe',
    family: 'family',
  };

  var HASH_ALIASES = {
    today: 'today',
    schedule: 'today',
    idag: 'today',
    universe: 'universe',
    rewards: 'universe',
    skattkammaren: 'universe',
    family: 'family',
    familj: 'family',
  };

  var _currentLayer = 'today';
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

    // Today-only elements
    var todayOnly = [scheduleView, todayFocus];
    todayOnly.forEach(function (el) {
      if (!el) return;
      if (layer === 'today') {
        if (el === todayFocus && window.ChildTodayFocus) {
          ChildTodayFocus.onTabChange('schedule');
        }
      }
    });

    // Universe: no task DOM
    if (layer === 'universe' && scheduleView) {
      scheduleView.setAttribute('data-layer-hidden', 'true');
    } else if (scheduleView) {
      scheduleView.removeAttribute('data-layer-hidden');
    }

    // Family: no tasks, no universe shop actions in family view
    if (familyView) {
      familyView.setAttribute('data-active', layer === 'family' ? 'true' : 'false');
    }

    if (layer === 'family' && window.ChildFamilyHall) {
      ChildFamilyHall.refresh();
    }
  }

  function highlightTab(tab) {
    var map = {
      schedule: 'tabSchedule',
      rewards: 'tabRewards',
      family: 'tabFamily',
    };
    Object.keys(map).forEach(function (key) {
      var el = document.getElementById(map[key]);
      if (!el) return;
      if (key === tab) {
        el.classList.add('border-gold', 'text-gold');
        el.classList.remove('border-transparent', 'text-text-soft');
      } else {
        el.classList.remove('border-gold', 'text-gold');
        el.classList.add('border-transparent', 'text-text-soft');
      }
    });
  }

  function onTabShown(tab) {
    var layer = TAB_TO_LAYER[tab] || 'today';
    setHash(layer);
    applyRouteGuards(layer);
    highlightTab(tab);

    if (tab === 'schedule' && window.ChildTodayFocus) {
      ChildTodayFocus.onTabChange('schedule');
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
      applyRouteGuards('today');
    }
  }

  window.ChildLayerRouter = {
    init: init,
    navigateToLayer: navigateToLayer,
    getCurrentLayer: function () { return _currentLayer; },
    LAYERS: LAYERS,
  };
})();
