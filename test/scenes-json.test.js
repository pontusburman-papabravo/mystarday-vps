'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadPack, clearPackCache } = require('../src/lib/experience-pack');
const { LIVING_WORLD_ROOMS, buildScenesJson } = require('../config/living-world-scenes-catalog.cjs');

const ROOT = path.join(__dirname, '..');
const SCENES_PATH = path.join(ROOT, 'config/experience-packs/child_se/scenes.json');

describe('scenes.json — LWES Appendix C pack', () => {
  it('scenes.json exists with 15 catalog scenes', () => {
    const data = JSON.parse(fs.readFileSync(SCENES_PATH, 'utf8'));
    assert.equal(data.version, '1.0.0');
    assert.equal(data.scenes.length, 15);
    assert.equal(data.scenes.length, LIVING_WORLD_ROOMS.length);
  });

  it('manifest includes scenes.json and loadPack exposes scenes', () => {
    clearPackCache();
    const pack = loadPack('child_se');
    assert.ok(pack.scenes);
    assert.equal(pack.scenes.scenes.length, 15);
    const bedroom = pack.scenes.scenes.find(function (s) { return s.scene_id === 'bedroom'; });
    assert.ok(bedroom);
    assert.ok(bedroom.hotspots.length >= 2);
    assert.ok(bedroom.hotspots.every(function (h) {
      return h.hit_area && typeof h.hit_area.x === 'number';
    }));
  });

  it('museum scene is present but not asset-exportable', () => {
    const data = buildScenesJson();
    const museum = data.scenes.find(function (s) { return s.scene_id === 'museum'; });
    assert.ok(museum);
    assert.equal(museum.asset_exportable, false);
  });

  it('generated client catalog matches wired interior rooms', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/living-world-scenes-catalog.js'), 'utf8');
    assert.match(src, /home_hall/);
    assert.match(src, /bedroom/);
    assert.match(src, /home_kitchen/);
    assert.match(src, /"wire_in": true/);
  });
});
