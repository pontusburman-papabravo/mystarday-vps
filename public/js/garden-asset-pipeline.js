/**
 * garden-asset-pipeline.js — Living World asset manifest v2 (Trädgården).
 * Thin wrapper over scene-asset-pipeline.js shared runtime.
 */
(function () {
  'use strict';

  if (!window.SceneAssetPipeline || typeof window.SceneAssetPipeline.create !== 'function') {
    throw new Error('garden-asset-pipeline.js requires scene-asset-pipeline.js');
  }

  window.GardenAssetPipeline = window.SceneAssetPipeline.create({
    base: '/images/child/world/garden/',
    version: '2.0.0',
    classPrefix: 'gd',
    scene: {
      id: 'scene-bg',
      file: 'scene-bg.webp',
      srcset: [
        { width: 430, file: 'scene-bg-430.webp' },
        { width: 860, file: 'scene-bg-860.webp' },
        { width: 1280, file: 'scene-bg-1280.webp' },
      ],
    },
    optionalAssets: [
      { id: 'sky-clouds', file: 'sky-clouds.webp', overlay: true },
      { id: 'ambient-bird', file: 'ambient-bird.webp', overlay: true },
      { id: 'ambient-butterfly', file: 'ambient-butterfly.webp', overlay: true },
    ],
    preloadWhenNoImage: true,
  });
})();
