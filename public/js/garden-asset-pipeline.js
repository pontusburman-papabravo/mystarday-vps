/**
 * garden-asset-pipeline.js — Living World asset manifest v1 (Trädgården).
 * Layer paths, layout hints, preload + fail-closed helpers.
 */
(function () {
  'use strict';

  const BASE = '/assets/worlds/garden/';
  const VERSION = '1.0.0';

  /** @type {ReadonlyArray<{id:string,file:string,layer:string,critical:boolean}>} */
  const LAYERS = Object.freeze([
    { id: 'background', file: 'background.webp', layer: 'sky-horizon', critical: true },
    { id: 'clouds', file: 'clouds.webp', layer: 'ambient-clouds', critical: false },
    { id: 'path', file: 'path.webp', layer: 'midground-path', critical: false },
    { id: 'flowers', file: 'flowers.webp', layer: 'midground-garden', critical: false },
    { id: 'house-left', file: 'house-left.webp', layer: 'house-edge', critical: true },
    { id: 'foreground-leaves', file: 'foreground-leaves.webp', layer: 'foreground', critical: false },
    { id: 'bird', file: 'bird.webp', layer: 'actor-bird', critical: false },
    { id: 'butterfly', file: 'butterfly.webp', layer: 'actor-butterfly', critical: false },
  ]);

  const CRITICAL_IDS = LAYERS.filter(function (l) { return l.critical; }).map(function (l) {
    return l.id;
  });

  function assetUrl(id) {
    const entry = LAYERS.find(function (l) { return l.id === id; });
    if (!entry) return null;
    return BASE + entry.file + '?v=' + VERSION;
  }

  function allAssetUrls() {
    return LAYERS.map(function (l) {
      return BASE + l.file + '?v=' + VERSION;
    });
  }

  function layerById(id) {
    return LAYERS.find(function (l) { return l.id === id; }) || null;
  }

  /**
   * Preload critical layers; resolves true when ready, false on any critical failure.
   * @param {number} [timeoutMs]
   * @returns {Promise<boolean>}
   */
  function preloadCritical(timeoutMs) {
    const limit = timeoutMs || 6000;
    const urls = CRITICAL_IDS.map(assetUrl).filter(Boolean);
    if (!urls.length || typeof Image === 'undefined') {
      return Promise.resolve(true);
    }

    return new Promise(function (resolve) {
      let settled = false;
      let pending = urls.length;
      let failed = false;

      function done(ok) {
        if (settled) return;
        if (!ok) failed = true;
        pending -= 1;
        if (pending <= 0) {
          settled = true;
          resolve(!failed);
        }
      }

      const timer = setTimeout(function () {
        settled = true;
        resolve(false);
      }, limit);

      urls.forEach(function (src) {
        const img = new Image();
        img.decoding = 'async';
        img.onload = function () { done(true); };
        img.onerror = function () { done(false); };
        img.src = src;
      });

      Promise.resolve().then(function () {
        if (settled) clearTimeout(timer);
      });
    });
  }

  /**
   * Watch scene images; toggles fallback class if critical asset fails after paint.
   * @param {HTMLElement} root
   * @returns {() => void} cleanup
   */
  function watchSceneAssets(root) {
    if (!root) return function () {};

    const scene = root.querySelector('.gd-scene');
    if (!scene) return function () {};

    const criticalSet = {};
    CRITICAL_IDS.forEach(function (id) { criticalSet[id] = true; });

    const handlers = [];

    root.querySelectorAll('.gd-asset[data-asset-id]').forEach(function (img) {
      const id = img.getAttribute('data-asset-id');
      if (!id) return;

      function onFail() {
        if (criticalSet[id]) {
          scene.classList.add('gd-scene--fallback');
        }
        img.classList.add('gd-asset--failed');
      }

      if (img.complete && img.naturalWidth === 0) {
        onFail();
        return;
      }

      function handleError() { onFail(); }
      img.addEventListener('error', handleError);
      handlers.push(function () { img.removeEventListener('error', handleError); });
    });

    return function cleanup() {
      handlers.forEach(function (fn) { fn(); });
    };
  }

  window.GardenAssetPipeline = {
    BASE: BASE,
    VERSION: VERSION,
    LAYERS: LAYERS,
    CRITICAL_IDS: CRITICAL_IDS,
    assetUrl: assetUrl,
    allAssetUrls: allAssetUrls,
    layerById: layerById,
    preloadCritical: preloadCritical,
    watchSceneAssets: watchSceneAssets,
  };
})();
