/**
 * memory-hall-asset-pipeline.js — Living World asset manifest (Minnesrummet).
 * Stub until Art HRC approves scene WebP binaries (BL-041).
 * Contract mirrors garden-asset-pipeline.js; fail-closed when assets missing.
 */
(function () {
  'use strict';

  const BASE = '/images/child/world/memory-hall/';
  const VERSION = '0.1.0-stub';

  const SCENE = Object.freeze({
    id: 'scene',
    file: 'scene@2x.webp',
    srcset: [
      { width: 430, file: 'scene-430.webp' },
      { width: 860, file: 'scene-860.webp' },
      { width: 1280, file: 'scene-1280.webp' },
    ],
  });

  /** @type {ReadonlyArray<{id:string,file:string}>} */
  const OPTIONAL_FRAMES = Object.freeze([
    { id: 'frame-empty', file: 'frame-empty@2x.webp' },
    { id: 'frame-glow', file: 'frame-glow@2x.webp' },
  ]);

  const CRITICAL_FILE = SCENE.file;

  function assetUrl(file) {
    return BASE + file + '?v=' + VERSION;
  }

  function scenePictureHtml() {
    const sources = SCENE.srcset.map(function (entry) {
      return '<source type="image/webp" media="(max-width: ' + entry.width + 'px)"' +
        ' srcset="' + assetUrl(entry.file) + '" />';
    }).join('');

    return '<picture class="mh-scene-picture" data-asset-id="scene">' +
      sources +
      '<img class="mh-scene-bg" data-asset-id="scene" data-critical="true"' +
        ' src="' + assetUrl(SCENE.file) + '"' +
        ' srcset="' +
          assetUrl('scene-430.webp') + ' 430w, ' +
          assetUrl('scene-860.webp') + ' 860w, ' +
          assetUrl('scene-1280.webp') + ' 1280w' +
        '"' +
        ' sizes="100vw"' +
        ' alt="" decoding="async" loading="eager" fetchpriority="high" />' +
      '</picture>';
  }

  function precacheUrls() {
    const urls = [SCENE.file];
    SCENE.srcset.forEach(function (e) { urls.push(e.file); });
    OPTIONAL_FRAMES.forEach(function (f) { urls.push(f.file); });
    return urls.map(assetUrl);
  }

  /**
   * @param {number} [timeoutMs]
   * @returns {Promise<boolean>}
   */
  function preloadScene(timeoutMs) {
    const limit = timeoutMs || 6000;
    const url = assetUrl(CRITICAL_FILE);
    if (typeof Image === 'undefined') return Promise.resolve(false);

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
    const img = root.querySelector('.mh-scene-bg');
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

  window.MemoryHallAssetPipeline = {
    BASE: BASE,
    VERSION: VERSION,
    SCENE: SCENE,
    OPTIONAL_FRAMES: OPTIONAL_FRAMES,
    CRITICAL_FILE: CRITICAL_FILE,
    assetUrl: assetUrl,
    scenePictureHtml: scenePictureHtml,
    precacheUrls: precacheUrls,
    preloadScene: preloadScene,
    watchSceneImage: watchSceneImage,
  };
})();
