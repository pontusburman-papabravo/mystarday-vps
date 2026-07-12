/**
 * child-legacy-chunk.js — Defer Min värld / morgonhus / ambient scripts until needed.
 * Barnets samling (gate ON) never loads this chunk — saves ~170 KB parse + 20 requests.
 */
(function () {
  'use strict';

  const LEGACY_SCRIPTS = [
    '/js/child-universe-client.js?v=1.0.0',
    '/js/child-pet.js?v=1.0.0',
    '/js/child-museum.js?v=1.0.0',
    '/js/child-skatt-house.js?v=2.3.0',
    '/js/child-living-world-transition.js?v=1.0.4',
    '/js/scene-asset-pipeline.js?v=1.0.0',
    '/js/morgonhus-asset-pipeline.js?v=1.0.0',
    '/js/child-world-wayfinder.js?v=1.2.0',
    '/js/ambient-objects-pack.js?v=1.0.1',
    '/js/ambient-director.js?v=1.0.0',
    '/js/ambient-object-runtime.js?v=1.0.1',
    '/js/child-world-hub.js?v=1.0.1',
    '/js/child-morgonhus.js?v=2.5.2',
    '/js/garden-asset-pipeline.js?v=2.0.0',
    '/js/memory-hall-asset-pipeline.js?v=1.2.0',
    '/js/child-garden.js?v=2.7.1',
    '/js/child-memory-hall.js?v=1.3.0',
    '/js/living-world-scenes-catalog.js?v=1.0.0',
    '/js/living-world-room-pipelines.js?v=1.0.0',
    '/js/child-catalog-room.js?v=1.0.0',
    '/js/child-family-hall-legacy.js?v=1.0.0',
    '/js/child-world.js?v=1.0.1',
  ];

  let _loading = null;
  let _loaded = false;

  function isSamlingOn() {
    if (document.documentElement.getAttribute('data-barnets-samling') === 'on') return true;
    return !!(window.ChildWorlds
      && window.ChildWorlds.isBarnetsSamlingEnabled
      && window.ChildWorlds.isBarnetsSamlingEnabled());
  }

  function scriptPath(src) {
    try {
      return new URL(src, window.location.origin).pathname;
    } catch (_) {
      return String(src || '').split('?')[0];
    }
  }

  function isAlreadyInDom(src) {
    const path = scriptPath(src);
    const scripts = document.scripts;
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scriptPath(scripts[i].src) === path) return true;
    }
    return false;
  }

  function loadOne(src) {
    if (isAlreadyInDom(src)) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      const el = document.createElement('script');
      el.src = src;
      el.async = false;
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error('legacy_chunk_failed:' + src)); };
      document.body.appendChild(el);
    });
  }

  function loadLegacyChunk() {
    if (_loaded) return Promise.resolve();
    if (_loading) return _loading;
    _loading = LEGACY_SCRIPTS.reduce(function (chain, src) {
      return chain.then(function () { return loadOne(src); });
    }, Promise.resolve()).then(function () {
      _loaded = true;
    }).catch(function (err) {
      _loading = null;
      console.warn('[child-legacy-chunk]', err.message || err);
      throw err;
    });
    return _loading;
  }

  function maybeLoadLegacy() {
    if (isSamlingOn()) return Promise.resolve();
    return loadLegacyChunk();
  }

  document.addEventListener('child-worlds-configured', function () {
    maybeLoadLegacy();
  });

  if (document.documentElement.getAttribute('data-barnets-samling') === 'off') {
    maybeLoadLegacy();
  }

  window.ChildLegacyChunk = {
    load: loadLegacyChunk,
    maybeLoad: maybeLoadLegacy,
    isLoaded: function () { return _loaded; },
  };
})();
