/**
 * scene-asset-pipeline.js — Shared Living World illustrated scene asset runtime.
 * Factory for per-world manifests (Trädgården, Minnesrummet, Morgonhuset).
 *
 * Consumers: garden-asset-pipeline.js, memory-hall-asset-pipeline.js
 * Future: morgonhus-asset-pipeline.js (CAP-002)
 */
(function () {
  'use strict';

  /**
   * @param {object} config
   * @param {string} config.base - Asset directory URL prefix
   * @param {string} config.version - Cache-bust query param
   * @param {{id:string,file:string,srcset:ReadonlyArray<{width:number,file:string}>}} config.scene
   * @param {ReadonlyArray<{id:string,file:string,overlay?:boolean}>} [config.optionalAssets]
   * @param {string} config.classPrefix - CSS prefix (e.g. gd → gd-scene-bg)
   * @param {boolean} [config.preloadWhenNoImage=true] - headless resolve when Image undefined
   * @returns {object} Pipeline API
   */
  function createSceneAssetPipeline(config) {
    if (!config || !config.base || !config.scene || !config.classPrefix) {
      throw new Error('SceneAssetPipeline.create: base, scene, and classPrefix required');
    }

    const base = config.base;
    const version = config.version;
    const scene = Object.freeze(config.scene);
    const optionalAssets = Object.freeze(config.optionalAssets || []);
    const classPrefix = config.classPrefix;
    const preloadWhenNoImage = config.preloadWhenNoImage !== false;
    const criticalFile = scene.file;
    const pictureClass = classPrefix + '-scene-picture';
    const imgClass = classPrefix + '-scene-bg';

    function assetUrl(file) {
      return base + file + '?v=' + version;
    }

    function scenePictureHtml() {
      const sources = scene.srcset.map(function (entry) {
        return '<source type="image/webp" media="(max-width: ' + entry.width + 'px)"' +
          ' srcset="' + assetUrl(entry.file) + '" />';
      }).join('');

      const srcsetW = scene.srcset.map(function (entry) {
        return assetUrl(entry.file) + ' ' + entry.width + 'w';
      }).join(', ');

      return '<picture class="' + pictureClass + '" data-asset-id="' + scene.id + '">' +
        sources +
        '<img class="' + imgClass + '" data-asset-id="' + scene.id + '" data-critical="true"' +
          ' src="' + assetUrl(scene.file) + '"' +
          ' srcset="' + srcsetW + '"' +
          ' sizes="100vw"' +
          ' alt="" decoding="async" loading="eager" fetchpriority="high" />' +
        '</picture>';
    }

    function precacheUrls() {
      const urls = [scene.file];
      scene.srcset.forEach(function (e) { urls.push(e.file); });
      optionalAssets.forEach(function (o) { urls.push(o.file); });
      return urls.map(assetUrl);
    }

    /**
     * @param {number} [timeoutMs]
     * @returns {Promise<boolean>}
     */
    function preloadScene(timeoutMs) {
      const limit = timeoutMs || 6000;
      const url = assetUrl(criticalFile);
      if (typeof Image === 'undefined') return Promise.resolve(preloadWhenNoImage);

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
      const img = root.querySelector('.' + imgClass);
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

    return Object.freeze({
      BASE: base,
      VERSION: version,
      SCENE: scene,
      SCENE_BG: scene,
      OPTIONAL_ASSETS: optionalAssets,
      OPTIONAL_OVERLAYS: optionalAssets,
      OPTIONAL_FRAMES: optionalAssets,
      CRITICAL_FILE: criticalFile,
      assetUrl: assetUrl,
      scenePictureHtml: scenePictureHtml,
      precacheUrls: precacheUrls,
      preloadScene: preloadScene,
      watchSceneImage: watchSceneImage,
    });
  }

  window.SceneAssetPipeline = {
    create: createSceneAssetPipeline,
  };
})();
