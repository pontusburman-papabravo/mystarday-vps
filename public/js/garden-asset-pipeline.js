/**
 * garden-asset-pipeline.js — Living World asset manifest v2 (Trädgården).
 * Illustrated scene-bg + responsive srcset; optional ambient overlays.
 */
(function () {
  'use strict';

  const BASE = '/images/child/world/garden/';
  const VERSION = '2.0.0';

  const SCENE_BG = Object.freeze({
    id: 'scene-bg',
    file: 'scene-bg.webp',
    srcset: [
      { width: 430, file: 'scene-bg-430.webp' },
      { width: 860, file: 'scene-bg-860.webp' },
      { width: 1280, file: 'scene-bg-1280.webp' },
    ],
  });

  /** @type {ReadonlyArray<{id:string,file:string,overlay?:boolean}>} */
  const OPTIONAL_OVERLAYS = Object.freeze([
    { id: 'sky-clouds', file: 'sky-clouds.webp', overlay: true },
    { id: 'ambient-bird', file: 'ambient-bird.webp', overlay: true },
    { id: 'ambient-butterfly', file: 'ambient-butterfly.webp', overlay: true },
  ]);

  const CRITICAL_FILE = SCENE_BG.file;

  function assetUrl(file) {
    return BASE + file + '?v=' + VERSION;
  }

  function scenePictureHtml() {
    const sources = SCENE_BG.srcset.map(function (entry) {
      return '<source type="image/webp" media="(max-width: ' + entry.width + 'px)"' +
        ' srcset="' + assetUrl(entry.file) + '" />';
    }).join('');

    return '<picture class="gd-scene-picture" data-asset-id="scene-bg">' +
      sources +
      '<img class="gd-scene-bg" data-asset-id="scene-bg" data-critical="true"' +
        ' src="' + assetUrl(SCENE_BG.file) + '"' +
        ' srcset="' +
          assetUrl('scene-bg-430.webp') + ' 430w, ' +
          assetUrl('scene-bg-860.webp') + ' 860w, ' +
          assetUrl('scene-bg-1280.webp') + ' 1280w' +
        '"' +
        ' sizes="100vw"' +
        ' alt="" decoding="async" loading="eager" fetchpriority="high" />' +
      '</picture>';
  }

  function precacheUrls() {
    const urls = [SCENE_BG.file];
    SCENE_BG.srcset.forEach(function (e) { urls.push(e.file); });
    OPTIONAL_OVERLAYS.forEach(function (o) { urls.push(o.file); });
    return urls.map(assetUrl);
  }

  /**
   * Preload primary scene image; false if critical asset unavailable.
   * @param {number} [timeoutMs]
   * @returns {Promise<boolean>}
   */
  function preloadScene(timeoutMs) {
    const limit = timeoutMs || 6000;
    const url = assetUrl(CRITICAL_FILE);
    if (typeof Image === 'undefined') return Promise.resolve(true);

    return new Promise(function (resolve) {
      let settled = false;
      const img = new Image();
      const timer = setTimeout(function () {
        if (!settled) { settled = true; resolve(false); }
      }, limit);
      img.onload = function () {
        if (!settled) { settled = true; clearTimeout(timer); resolve(true); }
      };
      img.onerror = function () {
        if (!settled) { settled = true; clearTimeout(timer); resolve(false); }
      };
      img.src = url;
    });
  }

  /**
   * @param {HTMLElement} root
   * @param {() => void} onCriticalFail
   * @returns {() => void}
   */
  function watchSceneImage(root, onCriticalFail) {
    if (!root) return function () {};
    const img = root.querySelector('.gd-scene-bg');
    if (!img) return function () {};

    function fail() {
      if (typeof onCriticalFail === 'function') onCriticalFail();
    }

    if (img.complete && img.naturalWidth === 0) {
      fail();
      return function () {};
    }

    function onError() { fail(); }
    img.addEventListener('error', onError);
    return function () { img.removeEventListener('error', onError); };
  }

  window.GardenAssetPipeline = {
    BASE: BASE,
    VERSION: VERSION,
    SCENE_BG: SCENE_BG,
    OPTIONAL_OVERLAYS: OPTIONAL_OVERLAYS,
    CRITICAL_FILE: CRITICAL_FILE,
    assetUrl: assetUrl,
    scenePictureHtml: scenePictureHtml,
    precacheUrls: precacheUrls,
    preloadScene: preloadScene,
    watchSceneImage: watchSceneImage,
  };
})();
