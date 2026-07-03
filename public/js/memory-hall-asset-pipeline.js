/**
 * memory-hall-asset-pipeline.js — Living World asset manifest (Minnesrummet).
 * Thin wrapper over scene-asset-pipeline.js — stub until Art HRC (BL-041).
 */
(function () {
  'use strict';

  if (!window.SceneAssetPipeline || typeof window.SceneAssetPipeline.create !== 'function') {
    throw new Error('memory-hall-asset-pipeline.js requires scene-asset-pipeline.js');
  }

  window.MemoryHallAssetPipeline = window.SceneAssetPipeline.create({
    base: '/images/child/world/memory-hall/',
    version: '0.2.0',
    classPrefix: 'mh',
    scene: {
      id: 'scene',
      file: 'scene@2x.webp',
      srcset: [
        { width: 430, file: 'scene-430.webp' },
        { width: 860, file: 'scene-860.webp' },
        { width: 1280, file: 'scene-1280.webp' },
      ],
    },
    optionalAssets: [
      { id: 'frame-empty', file: 'frame-empty@2x.webp' },
      { id: 'frame-glow', file: 'frame-glow@2x.webp' },
    ],
    preloadWhenNoImage: false,
  });
})();
