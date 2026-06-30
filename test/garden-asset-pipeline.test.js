'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ASSET_DIR = path.join(__dirname, '../public/assets/worlds/garden');
const EXPECTED_FILES = [
  'background.webp',
  'house-left.webp',
  'path.webp',
  'foreground-leaves.webp',
  'flowers.webp',
  'clouds.webp',
  'bird.webp',
  'butterfly.webp',
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

describe('garden asset pipeline v1', () => {
  it('all garden asset files exist on disk', () => {
    for (const file of EXPECTED_FILES) {
      const full = path.join(ASSET_DIR, file);
      assert.ok(fs.existsSync(full), 'missing ' + file);
      const stat = fs.statSync(full);
      assert.ok(stat.size > 0, file + ' is empty');
    }
  });

  it('total garden assets stay under 2 MB mobile budget', () => {
    let total = 0;
    for (const file of EXPECTED_FILES) {
      total += fs.statSync(path.join(ASSET_DIR, file)).size;
    }
    assert.ok(total < 2 * 1024 * 1024, 'assets exceed 2 MB: ' + total);
  });

  it('pipeline manifest lists all layer files', () => {
    const pipeline = loadPipeline();
    assert.ok(pipeline);
    assert.equal(pipeline.BASE, '/assets/worlds/garden/');
    const files = pipeline.LAYERS.map(function (l) { return l.file; });
    for (const expected of EXPECTED_FILES) {
      assert.ok(files.includes(expected), 'manifest missing ' + expected);
    }
  });

  it('pipeline marks background and house-left as critical', () => {
    const pipeline = loadPipeline();
    assert.ok(pipeline.CRITICAL_IDS.includes('background'));
    assert.ok(pipeline.CRITICAL_IDS.includes('house-left'));
    assert.equal(pipeline.CRITICAL_IDS.length, 2);
  });

  it('assetUrl returns versioned paths', () => {
    const pipeline = loadPipeline();
    const url = pipeline.assetUrl('path');
    assert.match(url, /^\/assets\/worlds\/garden\/path\.webp\?v=/);
  });

  it('allAssetUrls covers every layer', () => {
    const pipeline = loadPipeline();
    assert.equal(pipeline.allAssetUrls().length, pipeline.LAYERS.length);
  });
});

describe('garden asset pipeline — service worker precache', () => {
  const sw = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');

  it('precaches garden pipeline JS and all WebP layers', () => {
    assert.match(sw, /garden-asset-pipeline\.js/);
    for (const file of EXPECTED_FILES) {
      assert.match(sw, new RegExp('/assets/worlds/garden/' + file.replace('.', '\\.')));
    }
  });
});

describe('garden asset pipeline — renderer contract', () => {
  const gardenSrc = fs.readFileSync(
    path.join(__dirname, '../public/js/child-garden.js'),
    'utf8'
  );
  const css = fs.readFileSync(
    path.join(__dirname, '../public/css/child-garden.css'),
    'utf8'
  );

  it('child-garden uses asset layers, not geometric CSS primitives', () => {
    assert.match(gardenSrc, /gd-scene--asset/);
    assert.match(gardenSrc, /gd-asset/);
    assert.match(gardenSrc, /assets\/worlds\/garden/);
    assert.match(gardenSrc, /GardenAssetPipeline/);
    assert.doesNotMatch(gardenSrc, /gd-sunflower/);
    assert.doesNotMatch(gardenSrc, /gd-house-wall/);
    assert.doesNotMatch(gardenSrc, /gd-wildflower/);
    assert.doesNotMatch(gardenSrc, /border-radius: 50%/);
  });

  it('CSS positions absolute asset layers for mobile portrait', () => {
    assert.match(css, /\.gd-layer/);
    assert.match(css, /object-fit/);
    assert.match(css, /min-height: calc\(100dvh/);
    assert.match(css, /safe-area-inset/);
    assert.match(css, /prefers-reduced-motion/);
  });

  it('fail-closed fallback scene when assets fail', () => {
    const pipelineSrc = fs.readFileSync(
      path.join(__dirname, '../public/js/garden-asset-pipeline.js'),
      'utf8'
    );
    assert.match(pipelineSrc, /gd-scene--fallback/);
    assert.match(gardenSrc, /watchSceneAssets/);
    assert.match(gardenSrc, /preloadCritical/);
    assert.match(gardenSrc, /gd-fallback-bg/);
    assert.match(css, /\.gd-fallback-bg/);
    assert.match(css, /\.gd-scene--fallback/);
  });
});
