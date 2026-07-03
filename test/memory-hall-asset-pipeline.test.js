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
const PIPELINE_SRC = fs.readFileSync(
  path.join(__dirname, '../public/js/memory-hall-asset-pipeline.js'),
  'utf8'
);

function loadPipeline() {
  const context = { window: {} };
  vm.runInNewContext(CORE_SRC, context);
  vm.runInNewContext(PIPELINE_SRC, context);
  return context.window.MemoryHallAssetPipeline;
}

describe('memory-hall asset pipeline stub (BL-044)', () => {
  it('exposes scene srcset manifest matching art spec paths', () => {
    const pipeline = loadPipeline();
    assert.equal(pipeline.VERSION, '1.1.0');
    assert.equal(pipeline.SCENE.file, 'scene@2x.webp');
    assert.equal(pipeline.SCENE.srcset.length, 3);
    assert.equal(pipeline.CRITICAL_FILE, 'scene@2x.webp');
    assert.match(pipeline.assetUrl('scene@2x.webp'), /^\/images\/child\/world\/memory-hall\//);
    assert.ok(typeof pipeline.preloadScene === 'function');
    assert.ok(typeof pipeline.scenePictureHtml === 'function');
  });

  it('scenePictureHtml uses picture element with responsive sources', () => {
    const pipeline = loadPipeline();
    const html = pipeline.scenePictureHtml();
    assert.match(html, /<picture/);
    assert.match(html, /scene-430\.webp/);
    assert.match(html, /scene-860\.webp/);
    assert.match(html, /scene-1280\.webp/);
    assert.match(html, /mh-scene-bg/);
    assert.match(html, /sizes="100vw"/);
  });

  it('preloadScene resolves false without Image (headless)', async () => {
    const pipeline = loadPipeline();
    const ok = await pipeline.preloadScene(100);
    assert.equal(ok, false);
  });

  it('scene WebP assets exist on disk (G8 BL-041 v1)', () => {
    const pipeline = loadPipeline();
    assert.equal(pipeline.OPTIONAL_FRAMES.length, 2);
    const assetDir = path.join(__dirname, '../public/images/child/world/memory-hall');
    assert.ok(fs.existsSync(assetDir), 'memory-hall asset dir should exist after G8');
    const master = path.join(assetDir, 'scene@2x.webp');
    assert.ok(fs.statSync(master).size > 50000, 'scene master should be rich WebP v2');
    assert.ok(fs.existsSync(path.join(assetDir, 'scene-430.webp')));
    assert.ok(fs.existsSync(path.join(assetDir, 'scene-1280.webp')));
  });

  it('child-memory-hall.js wires pipeline for illustrated mount', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../public/js/child-memory-hall.js'),
      'utf8'
    );
    assert.match(src, /window\.MemoryHallAssetPipeline/);
    assert.match(src, /watchSceneImage/);
    assert.match(src, /falling back to scaffold/);
  });
});

describe('memory-hall art spec register alignment', () => {
  const specPath = path.join(__dirname, '../docs/art-specs/memory-hall-bl041.md');

  it('art spec documents scene asset paths (when spec present on branch)', () => {
    if (!fs.existsSync(specPath)) {
      return; // spec ships on IRC-015 branch; stub test is valid on relay-only branch
    }
    const spec = fs.readFileSync(specPath, 'utf8');
    assert.match(spec, /memory-hall\/scene@2x\.webp/);
    assert.match(spec, /scene-430\.webp/);
    assert.match(spec, /warm memory room/i);
  });
});
