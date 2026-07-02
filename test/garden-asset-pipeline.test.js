'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ASSET_DIR = path.join(__dirname, '../public/images/child/world/garden');
const SCENE_FILES = [
  'scene-bg.webp',
  'scene-bg-430.webp',
  'scene-bg-860.webp',
  'scene-bg-1280.webp',
];
const OPTIONAL_FILES = [
  'foreground-left.webp',
  'foreground-right.webp',
  'house-door.webp',
  'path.webp',
  'sky-clouds.webp',
  'ambient-bird.webp',
  'ambient-butterfly.webp',
];

const PIPELINE_SRC = fs.readFileSync(
  path.join(__dirname, '../public/js/garden-asset-pipeline.js'),
  'utf8'
);

function loadPipeline() {
  const context = { window: {}, document: {} };
  vm.runInNewContext(PIPELINE_SRC, context);
  return context.window.GardenAssetPipeline;
}

describe('garden illustrated asset pipeline v2', () => {
  it('scene-bg responsive assets exist on disk', () => {
    for (const file of SCENE_FILES) {
      const full = path.join(ASSET_DIR, file);
      assert.ok(fs.existsSync(full), 'missing ' + file);
      assert.ok(fs.statSync(full).size > 1000, file + ' too small');
    }
  });

  it('optional overlay slot files exist', () => {
    for (const file of OPTIONAL_FILES) {
      assert.ok(fs.existsSync(path.join(ASSET_DIR, file)), 'missing ' + file);
    }
  });

  it('legacy CSS-diorama assets are removed', () => {
    const legacy = ['background.webp', 'house-left.webp', 'flowers.webp', 'foreground-leaves.webp'];
    for (const file of legacy) {
      assert.equal(fs.existsSync(path.join(ASSET_DIR, file)), false, 'legacy asset still present: ' + file);
    }
  });

  it('total scene assets stay under 2 MB mobile budget', () => {
    let total = 0;
    SCENE_FILES.forEach(function (file) {
      total += fs.statSync(path.join(ASSET_DIR, file)).size;
    });
    assert.ok(total < 2 * 1024 * 1024, 'scene assets exceed 2 MB: ' + total);
  });

  it('pipeline exposes scene-bg srcset and preloadScene', () => {
    const pipeline = loadPipeline();
    assert.equal(pipeline.VERSION, '2.0.0');
    assert.equal(pipeline.SCENE_BG.file, 'scene-bg.webp');
    assert.equal(pipeline.SCENE_BG.srcset.length, 3);
    assert.equal(pipeline.CRITICAL_FILE, 'scene-bg.webp');
    assert.match(pipeline.assetUrl('scene-bg.webp'), /^\/images\/child\/world\/garden\/scene-bg\.webp\?v=/);
    assert.ok(typeof pipeline.preloadScene === 'function');
    assert.ok(typeof pipeline.scenePictureHtml === 'function');
  });

  it('scenePictureHtml uses picture element with responsive sources', () => {
    const pipeline = loadPipeline();
    const html = pipeline.scenePictureHtml();
    assert.match(html, /<picture/);
    assert.match(html, /scene-bg-430\.webp/);
    assert.match(html, /scene-bg-860\.webp/);
    assert.match(html, /scene-bg-1280\.webp/);
    assert.match(html, /sizes="100vw"/);
  });
});

describe('garden illustrated assets — service worker precache', () => {
  const sw = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');

  it('precaches pipeline JS and scene-bg responsive WebP set', () => {
    assert.match(sw, /garden-asset-pipeline\.js/);
    for (const file of SCENE_FILES) {
      assert.match(sw, new RegExp('/images/child/world/garden/' + file.replace('.', '\\.')));
    }
  });
});

describe('garden illustrated renderer contract', () => {
  const gardenSrc = fs.readFileSync(
    path.join(__dirname, '../public/js/child-garden.js'),
    'utf8'
  );
  const css = fs.readFileSync(
    path.join(__dirname, '../public/css/child-garden.css'),
    'utf8'
  );

  it('child-garden renders picture-based scene, not CSS world drawing', () => {
    assert.match(gardenSrc, /gd-scene--illustrated/);
    assert.match(gardenSrc, /<picture/);
    assert.match(gardenSrc, /scene-bg/);
    assert.match(gardenSrc, /GardenAssetPipeline/);
    assert.doesNotMatch(gardenSrc, /gd-sunflower/);
    assert.doesNotMatch(gardenSrc, /gd-house-wall/);
    assert.doesNotMatch(gardenSrc, /gd-house-edge/);
    assert.doesNotMatch(gardenSrc, /spawnSparkles/);
  });

  it('CSS is layout and animation only', () => {
    assert.match(css, /object-fit: cover/);
    assert.match(css, /min-height: calc\(100dvh/);
    assert.match(css, /safe-area-inset/);
    assert.match(css, /prefers-reduced-motion/);
    assert.doesNotMatch(css, /gd-house-wall/);
    assert.doesNotMatch(css, /linear-gradient\(180deg, #9ed4f7/);
    assert.doesNotMatch(css, /\.gd-sun\b/);
  });

  it('fail-closed returns to Morgonhus when scene asset missing', () => {
    assert.match(gardenSrc, /preloadScene/);
    assert.match(gardenSrc, /scene-bg unavailable/);
    assert.match(gardenSrc, /exitToMorgonhus/);
    assert.match(gardenSrc, /watchSceneImage/);
    assert.doesNotMatch(gardenSrc, /gd-scene--fallback/);
    assert.doesNotMatch(css, /gd-fallback-bg/);
  });
});
