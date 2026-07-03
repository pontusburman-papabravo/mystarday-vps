'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE_SRC = fs.readFileSync(
  path.join(__dirname, '../public/js/scene-asset-pipeline.js'),
  'utf8'
);
const GARDEN_SRC = fs.readFileSync(
  path.join(__dirname, '../public/js/garden-asset-pipeline.js'),
  'utf8'
);
const MEMORY_HALL_SRC = fs.readFileSync(
  path.join(__dirname, '../public/js/memory-hall-asset-pipeline.js'),
  'utf8'
);

function loadCore() {
  const context = { window: {} };
  vm.runInNewContext(CORE_SRC, context);
  return context.window.SceneAssetPipeline;
}

function loadGardenPipeline() {
  const context = { window: {} };
  vm.runInNewContext(CORE_SRC, context);
  vm.runInNewContext(GARDEN_SRC, context);
  return context.window.GardenAssetPipeline;
}

function loadMemoryHallPipeline() {
  const context = { window: {} };
  vm.runInNewContext(CORE_SRC, context);
  vm.runInNewContext(MEMORY_HALL_SRC, context);
  return context.window.MemoryHallAssetPipeline;
}

describe('scene-asset-pipeline shared runtime (CAP-001)', () => {
  it('create throws when required config missing', () => {
    const core = loadCore();
    assert.throws(function () { core.create({}); }, /base, scene, and classPrefix required/);
  });

  it('factory builds picture HTML with configurable class prefix', () => {
    const core = loadCore();
    const pipeline = core.create({
      base: '/images/child/world/test/',
      version: '1.0.0',
      classPrefix: 'tw',
      scene: {
        id: 'scene',
        file: 'scene.webp',
        srcset: [
          { width: 430, file: 'scene-430.webp' },
          { width: 860, file: 'scene-860.webp' },
        ],
      },
    });
    const html = pipeline.scenePictureHtml();
    assert.match(html, /tw-scene-picture/);
    assert.match(html, /tw-scene-bg/);
    assert.match(html, /scene-430\.webp/);
    assert.match(html, /sizes="100vw"/);
  });

  it('precacheUrls includes scene, srcset, and optional assets', () => {
    const core = loadCore();
    const pipeline = core.create({
      base: '/images/child/world/test/',
      version: '1.0.0',
      classPrefix: 'tw',
      scene: {
        id: 'scene',
        file: 'scene.webp',
        srcset: [{ width: 430, file: 'scene-430.webp' }],
      },
      optionalAssets: [{ id: 'overlay', file: 'overlay.webp' }],
    });
    const urls = pipeline.precacheUrls();
    assert.equal(urls.length, 3);
    assert.ok(urls.every(function (u) { return u.includes('?v=1.0.0'); }));
  });

  it('preloadWhenNoImage controls headless preloadScene default', async function () {
    const core = loadCore();
    const optimistic = core.create({
      base: '/x/', version: '1', classPrefix: 'a',
      scene: { id: 's', file: 's.webp', srcset: [] },
      preloadWhenNoImage: true,
    });
    const pessimistic = core.create({
      base: '/x/', version: '1', classPrefix: 'b',
      scene: { id: 's', file: 's.webp', srcset: [] },
      preloadWhenNoImage: false,
    });
    assert.equal(await optimistic.preloadScene(50), true);
    assert.equal(await pessimistic.preloadScene(50), false);
  });

  it('watchSceneImage binds to classPrefix-scene-bg selector', function () {
    const core = loadCore();
    const pipeline = core.create({
      base: '/x/', version: '1', classPrefix: 'zz',
      scene: { id: 's', file: 's.webp', srcset: [] },
    });
    let failed = false;
    const root = {
      querySelector: function (sel) {
        assert.equal(sel, '.zz-scene-bg');
        return { complete: true, naturalWidth: 0, addEventListener: function () {}, removeEventListener: function () {} };
      },
    };
    pipeline.watchSceneImage(root, function () { failed = true; });
    assert.equal(failed, true);
  });
});

describe('scene-asset-pipeline world wrappers', () => {
  it('garden wrapper preserves v2 API surface', function () {
    const pipeline = loadGardenPipeline();
    assert.equal(pipeline.VERSION, '2.0.0');
    assert.equal(pipeline.SCENE_BG.file, 'scene-bg.webp');
    assert.equal(pipeline.OPTIONAL_OVERLAYS.length, 3);
    assert.match(pipeline.assetUrl('scene-bg.webp'), /\/images\/child\/world\/garden\//);
  });

  it('memory-hall wrapper preserves stub API surface', function () {
    const pipeline = loadMemoryHallPipeline();
    assert.equal(pipeline.VERSION, '0.2.0');
    assert.equal(pipeline.SCENE.file, 'scene@2x.webp');
    assert.equal(pipeline.OPTIONAL_FRAMES.length, 2);
    assert.match(pipeline.scenePictureHtml(), /mh-scene-bg/);
  });
});
