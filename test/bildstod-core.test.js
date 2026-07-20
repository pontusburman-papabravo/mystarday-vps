'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  PICTOGRAMS,
  getPictogram,
  isValidPictogramKey,
  validatePictogramKey,
  listPictogramsForApi,
  enrichPictogramFields,
} = require('../config/pictogram-library');
const { CreateActivitySchema } = require('../src/lib/schemas');

const ROOT = path.join(__dirname, '..');

describe('bildstöd core — pictogram library', () => {
  it('has at least 80 pictogram keys with label and emoji or imagePath', () => {
    assert.ok(PICTOGRAMS.length >= 80, `expected >= 80 pictograms, got ${PICTOGRAMS.length}`);
    const keys = new Set();
    for (const entry of PICTOGRAMS) {
      assert.ok(entry.key, 'missing key');
      assert.ok(entry.label, `missing label for ${entry.key}`);
      assert.ok(entry.emoji || entry.imagePath, `missing visual for ${entry.key}`);
      assert.ok(entry.category, `missing category for ${entry.key}`);
      assert.ok(!keys.has(entry.key), `duplicate key ${entry.key}`);
      keys.add(entry.key);
    }
  });

  it('getPictogram resolves known keys from legacy seven-questions set', () => {
    for (const legacyKey of ['brush_teeth', 'wash_hands', 'school', 'happy', 'wait']) {
      const pic = getPictogram(legacyKey);
      assert.ok(pic, legacyKey);
      assert.equal(pic.key, legacyKey);
    }
  });

  it('validatePictogramKey rejects unknown keys', () => {
    assert.equal(isValidPictogramKey(null), true);
    assert.equal(isValidPictogramKey('brush_teeth'), true);
    assert.equal(isValidPictogramKey('not_a_real_key'), false);
    assert.match(validatePictogramKey('not_a_real_key'), /bildnyckel/i);
  });

  it('listPictogramsForApi returns api shape with url', () => {
    const list = listPictogramsForApi();
    assert.equal(list.length, PICTOGRAMS.length);
    const row = list.find((p) => p.key === 'wake_up');
    assert.ok(row);
    assert.equal(row.label, 'Vakna');
    assert.match(row.url, /\/assets\/min-stjarndag-design-kit\/icons\/svg\/light\/vakna\.svg$/);
  });

  it('enrichPictogramFields adds pictogram_emoji when no custom photo', () => {
    const enriched = enrichPictogramFields({ icon_key: 'brush_teeth', icon: '📌' });
    assert.equal(enriched.pictogram_emoji, '🪥');
    assert.match(enriched.pictogram_url, /borsta-tanderna\.svg$/);
    const withPhoto = enrichPictogramFields({ icon_key: 'brush_teeth', image_url: '/uploads/x.jpg' });
    assert.equal(withPhoto.pictogram_emoji, undefined);
  });
});

describe('bildstöd core — activity schema icon_key', () => {
  it('CreateActivitySchema accepts valid icon_key', () => {
    const parsed = CreateActivitySchema.safeParse({ name: 'Test', icon_key: 'brush_teeth' });
    assert.equal(parsed.success, true);
  });

  it('CreateActivitySchema accepts null icon_key', () => {
    const parsed = CreateActivitySchema.safeParse({ name: 'Test', icon_key: null });
    assert.equal(parsed.success, true);
  });
});

describe('bildstöd core — activity-visual priority chain', () => {
  it('pick prefers image_url over icon_key and emoji', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/activity-visual.js'), 'utf8');
    assert.match(src, /customUrl = item\.image_url/);
    assert.match(src, /pictogramEmoji\(item\)/);
    assert.match(src, /fromKey \|\| item\.icon/);
  });
});

describe('bildstöd core — star grid render logic', () => {
  it('ChildRewardsEngine builds filled and empty cells from balance and goal', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-rewards-engine.js'), 'utf8');
    assert.match(src, /computeStarGridProgress/);
    assert.match(src, /buildStarGridCells/);
    assert.match(src, /starGridHtml/);
    assert.match(src, /STAR_GRID_MAX_CELLS/);
    assert.match(src, /is-filled/);
  });

  it('Skattkammaren hero renders star grid via ChildRewardsEngine', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-rewards.js'), 'utf8');
    assert.match(src, /ChildRewardsEngine\.starGridHtml/);
    assert.doesNotMatch(src, /skatt-reward-grid/);
  });
});
