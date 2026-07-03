/**
 * living-world-room-pipelines.js — Asset pipelines for catalog rooms (scene-bg set).
 */
(function () {
  'use strict';

  if (!window.SceneAssetPipeline || typeof window.SceneAssetPipeline.create !== 'function') {
    throw new Error('living-world-room-pipelines.js requires scene-asset-pipeline.js');
  }

  window.RoomAssetPipelines = window.RoomAssetPipelines || {};

  function registerRoomPipeline(room) {
    window.RoomAssetPipelines[room.world_id] = window.SceneAssetPipeline.create({
      base: '/images/child/world/' + room.asset_dir + '/',
      version: '1.0.0',
      classPrefix: room.class_prefix,
      scene: {
        id: 'scene-bg',
        file: 'scene-bg.webp',
        srcset: [
          { width: 430, file: 'scene-bg-430.webp' },
          { width: 860, file: 'scene-bg-860.webp' },
          { width: 1280, file: 'scene-bg-1280.webp' },
        ],
      },
      optionalAssets: [],
      preloadWhenNoImage: true,
    });
  }

  function boot() {
    const catalog = window.LivingWorldScenesCatalog;
    if (!catalog || !catalog.rooms) return;
    catalog.rooms.forEach(function (room) {
      if (!room.asset_exportable || room.wired_via) return;
      registerRoomPipeline(room);
    });
  }

  boot();
})();
