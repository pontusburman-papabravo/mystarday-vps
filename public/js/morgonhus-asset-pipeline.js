/**
 * morgonhus-asset-pipeline.js — Living World asset manifest (Morgonhuset).
 * Thin wrapper over scene-asset-pipeline.js shared runtime.
 * Scene rendered via CSS background today; picture HTML ready for future srcset.
 */
(function () {
  'use strict';

  if (!window.SceneAssetPipeline || typeof window.SceneAssetPipeline.create !== 'function') {
    throw new Error('morgonhus-asset-pipeline.js requires scene-asset-pipeline.js');
  }

  window.MorgonhusAssetPipeline = window.SceneAssetPipeline.create({
    base: '/images/child/morgonhus/',
    version: '1.0.0',
    classPrefix: 'morg',
    scene: {
      id: 'scene',
      file: 'scene@2x.webp',
      srcset: [
        { width: 860, file: 'scene@2x.webp' },
      ],
    },
    optionalAssets: [],
    preloadWhenNoImage: true,
  });
})();
