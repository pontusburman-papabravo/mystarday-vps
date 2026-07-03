'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  ROOM_SLUGS,
  EXPORTABLE_SLUGS,
  SCENE_EXPORTS,
  SCENE_FILE_NAMES,
  MOBILE_BUDGET_BYTES,
  slugToFilePrefix,
  sourceCandidatesForSlug,
  heightForWidth,
  exportRoomScene,
  resolveMaster,
  sceneSetTotalBytes,
} = require('../scripts/room-scene-export-lib.cjs');

const ROOT = path.join(__dirname, '..');
const SOURCES = path.join(ROOT, 'scripts/sources');

describe('room scene export — catalog contract', () => {
  it('ROOM_SLUGS covers 13 non-garden catalog rooms', () => {
    assert.equal(ROOM_SLUGS.length, 13);
    assert.ok(!ROOM_SLUGS.includes('garden'));
    assert.equal(EXPORTABLE_SLUGS.length, 13);
    assert.equal(slugToFilePrefix('pet_house'), 'pet-house');
    assert.equal(slugToFilePrefix('reading_corner'), 'reading-corner');
  });

  it('scene exports match garden aspect (860×1859)', () => {
    assert.equal(heightForWidth(860), 1859);
    assert.equal(SCENE_EXPORTS.length, 4);
    assert.equal(SCENE_EXPORTS[0][0], 'scene-bg-430.webp');
    assert.equal(SCENE_EXPORTS[3][0], 'scene-bg-1280.webp');
  });

  it('source masters follow {slug}-scene-master-high.png convention', () => {
    for (const slug of EXPORTABLE_SLUGS) {
      const master = sourceCandidatesForSlug(ROOT, slug)[0];
      assert.ok(
        fs.existsSync(master),
        'missing source for ' + slug + ': ' + path.basename(master)
      );
    }
    assert.ok(
      fs.existsSync(path.join(SOURCES, 'museum-scene-master-high.png')),
      'museum-scene-master-high.png required (alias of memory hall master per 130-museum.yaml)'
    );
  });

  it('legacy misnamed sources are cleaned up', () => {
    assert.equal(fs.existsSync(path.join(ROOT, 'home-scene-master-high.png')), false);
    assert.equal(fs.existsSync(path.join(SOURCES, 'verksatd 2.png')), false);
    assert.equal(fs.existsSync(path.join(SOURCES, 'memory_hall_scene_hero .png')), false);
    assert.ok(fs.existsSync(path.join(SOURCES, 'memory-hall-scene-master-high.png')));
    assert.ok(fs.existsSync(path.join(SOURCES, 'hall-hero-fireplace.png')));
    assert.ok(fs.existsSync(path.join(SOURCES, 'lake-scene-master-high.png')));
  });
});

describe('exported room scene assets (home → lake)', () => {
  for (const slug of EXPORTABLE_SLUGS) {
    const dirName = slugToFilePrefix(slug);
    const assetDir = path.join(ROOT, 'public/images/child/world', dirName);

    it(slug + ' scene-bg responsive webp set exists on disk', () => {
      for (const file of SCENE_FILE_NAMES) {
        const full = path.join(assetDir, file);
        assert.ok(fs.existsSync(full), slug + ' missing ' + file);
        assert.ok(fs.statSync(full).size > 1000, slug + ' ' + file + ' too small');
      }
    });

    it(slug + ' scene set stays under 2 MB mobile budget', () => {
      const total = sceneSetTotalBytes(ROOT, slug);
      assert.ok(total !== null, slug + ' scene set incomplete');
      assert.ok(total < MOBILE_BUDGET_BYTES, slug + ' exceeds 2 MB: ' + total);
    });
  }

  it('resolveMaster finds sources without explicit path', () => {
    for (const slug of EXPORTABLE_SLUGS) {
      const master = resolveMaster(ROOT, slug);
      assert.match(master, new RegExp(slugToFilePrefix(slug) + '-scene-master-high\\.png$'));
    }
  });

  it('exportRoomScene is idempotent for bedroom master', async function () {
    const master = resolveMaster(ROOT, 'bedroom');
    const first = await exportRoomScene('bedroom', master, { root: ROOT, log: false });
    const second = await exportRoomScene('bedroom', master, { root: ROOT, log: false });
    assert.equal(first.files.length, 4);
    assert.equal(second.totalBytes, first.totalBytes);
    assert.ok(first.totalBytes < MOBILE_BUDGET_BYTES);
  });
});

describe('generate-room-scene CLI wiring', () => {
  it('npm scripts are registered in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.match(pkg.scripts['generate:room-scene'], /generate-room-scene\.mjs/);
    assert.match(pkg.scripts['generate:room-scenes'], /--all/);
  });

  it('generate-room-scene.mjs exists and delegates to shared lib', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/generate-room-scene.mjs'), 'utf8');
    assert.match(src, /room-scene-export-lib\.cjs/);
    assert.match(src, /exportAllRooms/);
  });
});
