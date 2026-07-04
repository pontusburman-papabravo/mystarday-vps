'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE_SRC = fs.readFileSync(path.join(__dirname, '../public/js/scene-asset-pipeline.js'), 'utf8');
const MORG_SRC = fs.readFileSync(path.join(__dirname, '../public/js/morgonhus-asset-pipeline.js'), 'utf8');
const MORGONHUS_SRC = fs.readFileSync(path.join(__dirname, '../public/js/child-morgonhus.js'), 'utf8');

function loadMorgonhusPipeline() {
  const context = { window: {} };
  vm.runInNewContext(CORE_SRC, context);
  vm.runInNewContext(MORG_SRC, context);
  return context.window.MorgonhusAssetPipeline;
}

describe('morgonhus-asset-pipeline (CAP-002)', () => {
  it('exposes scene@2x.webp manifest under morgonhus base path', function () {
    const pipeline = loadMorgonhusPipeline();
    assert.equal(pipeline.VERSION, '1.0.0');
    assert.equal(pipeline.CRITICAL_FILE, 'scene@2x.webp');
    assert.match(pipeline.assetUrl('scene@2x.webp'), /\/images\/child\/morgonhus\/scene@2x\.webp/);
  });

  it('precacheUrls includes critical scene file', function () {
    const pipeline = loadMorgonhusPipeline();
    const urls = pipeline.precacheUrls();
    assert.equal(urls.length, 2);
    assert.ok(urls[0].includes('scene@2x.webp'));
  });

  it('child-morgonhus renders scene via MorgonhusAssetPipeline picture markup', function () {
    assert.match(MORGONHUS_SRC, /MorgonhusAssetPipeline/);
    assert.match(MORGONHUS_SRC, /scenePictureHtml/);
    assert.match(MORGONHUS_SRC, /watchSceneImage/);
    assert.doesNotMatch(MORGONHUS_SRC, /probeSceneArt/);
  });
});
