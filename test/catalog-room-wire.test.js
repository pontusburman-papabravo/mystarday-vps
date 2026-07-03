'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const WIRED = ['home_hall', 'bedroom', 'home_kitchen', 'home_bathroom', 'attic'];
const SCENE_FILES = [
  'scene-bg.webp',
  'scene-bg-430.webp',
  'scene-bg-860.webp',
  'scene-bg-1280.webp',
];

describe('catalog room wire-in (hall + 102–105)', () => {
  it('child-dashboard loads catalog room scripts', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(html, /living-world-scenes-catalog\.js/);
    assert.match(html, /living-world-room-pipelines\.js/);
    assert.match(html, /child-catalog-room\.js/);
    assert.match(html, /child-catalog-room\.css/);
  });

  it('morgonhus exposes Hallen entry to home_hall', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-morgonhus.js'), 'utf8');
    assert.match(src, /mhHallLink/);
    assert.match(src, /enterWorld\('home_hall'/);
  });

  for (const worldId of WIRED) {
    it(worldId + ' scene-bg assets exist on disk', () => {
      const catalogSrc = fs.readFileSync(path.join(ROOT, 'public/js/living-world-scenes-catalog.js'), 'utf8');
      const dirMatch = catalogSrc.match(new RegExp('"world_id": "' + worldId + '"[\\s\\S]*?"asset_dir": "([^"]+)"'));
      assert.ok(dirMatch, 'asset_dir for ' + worldId);
      const dir = dirMatch[1];
      for (const file of SCENE_FILES) {
        const full = path.join(ROOT, 'public/images/child/world', dir, file);
        assert.ok(fs.existsSync(full), worldId + ' missing ' + file);
      }
    });
  }

  it('ChildCatalogRoom registers LivingWorldTransition handlers', () => {
    const transitionSrc = fs.readFileSync(path.join(ROOT, 'public/js/child-living-world-transition.js'), 'utf8');
    const catalogSrc = fs.readFileSync(path.join(ROOT, 'public/js/living-world-scenes-catalog.js'), 'utf8');
    const roomSrc = fs.readFileSync(path.join(ROOT, 'public/js/child-catalog-room.js'), 'utf8');
    assert.match(transitionSrc, /registerWorld/);
    assert.match(roomSrc, /registerTransitionHandlers/);
    assert.match(roomSrc, /preloadScene/);
    assert.match(roomSrc, /scene-bg unavailable/);
    assert.match(catalogSrc, /getRoomByWorldId/);
  });

  it('room asset pipelines expose scene-bg srcset per wired room', () => {
    const core = fs.readFileSync(path.join(ROOT, 'public/js/scene-asset-pipeline.js'), 'utf8');
    const catalog = fs.readFileSync(path.join(ROOT, 'public/js/living-world-scenes-catalog.js'), 'utf8');
    const pipelines = fs.readFileSync(path.join(ROOT, 'public/js/living-world-room-pipelines.js'), 'utf8');
    const ctx = { window: {} };
    vm.runInNewContext(core, ctx);
    vm.runInNewContext(catalog, ctx);
    vm.runInNewContext(pipelines, ctx);
    for (const worldId of WIRED) {
      const p = ctx.window.RoomAssetPipelines[worldId];
      assert.ok(p, 'pipeline for ' + worldId);
      assert.equal(p.SCENE.file, 'scene-bg.webp');
      assert.equal(p.SCENE.srcset.length, 3);
    }
  });

  it('child-catalog-room CSS respects reduced motion and 44pt targets', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/child-catalog-room.css'), 'utf8');
    assert.match(css, /object-fit: cover/);
    assert.match(css, /min-width: 44px/);
    assert.match(css, /prefers-reduced-motion/);
  });
});
