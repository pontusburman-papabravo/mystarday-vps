'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'public/images/child/manifest.json');
const CHILD_IMG = path.join(ROOT, 'public/images/child');

describe('child art assets — manifest + files', () => {
  it('manifest.json exists and links to registry', () => {
    const data = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    assert.equal(data.root, '/images/child');
    assert.ok(Array.isArray(data.assets) && data.assets.length >= 10);
    assert.match(fs.readFileSync(path.join(ROOT, 'docs/child-image-assets.md'), 'utf8'), /public\/images\/child/);
  });

  it('godkänd assets exist on disk', () => {
    const { assets } = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    for (const asset of assets.filter((a) => a.status === 'godkänd')) {
      const full = path.join(CHILD_IMG, asset.path);
      assert.ok(fs.existsSync(full), `missing ${asset.id}: ${asset.path}`);
    }
  });

  it('CSS references use /images/child/ not legacy /img/ paths', () => {
    const cssFiles = [
      'public/css/child-world-bg.css',
      'public/css/child-skatt-house.css',
      'public/css/child-skatt-rooms.css',
    ];
    for (const rel of cssFiles) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.doesNotMatch(src, /\/img\/child-worlds\//);
      assert.doesNotMatch(src, /\/img\/skatt-rooms\//);
      assert.doesNotMatch(src, /\/img\/skatt-hubs\//);
      assert.match(src, /\/images\/child\//);
    }
  });

  it('sw precache includes canonical child image paths', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(sw, /\/images\/child\/today\/bg@2x\.webp/);
    assert.match(sw, /\/images\/child\/world\/hub-castle@2x\.webp/);
    assert.match(sw, /\/images\/child\/morgonhus\/scene@2x\.webp/);
    assert.match(sw, /\/js\/child-world-bg-lazy\.js/);
    assert.doesNotMatch(sw, /\/img\/skatt-rooms\//);
  });

  it('lazy bg defers world/family until layer visit', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/child-world-bg.css'), 'utf8');
    const lazy = fs.readFileSync(path.join(ROOT, 'public/js/child-world-bg-lazy.js'), 'utf8');
    assert.match(css, /\.cwb-today[\s\S]*\/images\/child\/today\/bg@2x\.webp/);
    assert.match(css, /\.is-bg-loaded/);
    assert.match(lazy, /\/images\/child\/world\/hub@2x\.webp/);
    assert.match(lazy, /\/images\/child\/family\/hall@2x\.webp/);
  });

  it('garden pipeline uses canonical child image path', () => {
    const pipeline = fs.readFileSync(path.join(ROOT, 'public/js/garden-asset-pipeline.js'), 'utf8');
    assert.match(pipeline, /\/images\/child\/world\/garden\//);
    assert.doesNotMatch(pipeline, /\/assets\/worlds\/garden\//);
  });

  it('today focus wires decal assets', () => {
    const focus = fs.readFileSync(path.join(ROOT, 'public/js/child-today-focus.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/child-today-focus.css'), 'utf8');
    assert.match(focus, /today-empty-v1@2x\.webp/);
    assert.match(focus, /today-celebration-frame-v1@2x\.webp/);
    assert.match(css, /\.ctf-empty-illus/);
    assert.match(css, /\.ctf-celebration-frame/);
  });
});
