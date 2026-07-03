'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  loadPack,
  clearPackCache,
  getExhibitWorldDef,
  buildExhibitViews,
} = require('../src/lib/experience-pack');

const WORLD = 'memory_hall';
const CHILD_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function validateExhibitsFile(raw) {
  const errors = [];
  const slotTypes = new Set(Object.keys(raw.slot_types || {}));
  for (const world of raw.worlds || []) {
    if (!world.world_slug) errors.push('exhibit world missing world_slug');
    for (const slot of world.slots || []) {
      if (!slot.slot_id) errors.push('exhibit slot missing slot_id');
      if (!slot.slot_type) errors.push(`slot ${slot.slot_id || '?'} missing slot_type`);
      else if (!slotTypes.has(slot.slot_type)) {
        errors.push(`slot ${slot.slot_id} unknown slot_type ${slot.slot_type}`);
      }
    }
  }
  return errors;
}

describe('memory hall exhibits pack schema (BL-029b prep)', () => {
  beforeEach(() => clearPackCache());

  it('manifest includes exhibits.json on disk', () => {
    const packPath = path.join(__dirname, '../config/experience-packs/child_se');
    const manifest = JSON.parse(fs.readFileSync(path.join(packPath, 'manifest.json'), 'utf8'));
    assert.equal(manifest.includes.exhibits, 'exhibits.json');
    assert.ok(fs.existsSync(path.join(packPath, 'exhibits.json')));
  });

  it('on-disk exhibits.json passes structural validation', () => {
    const raw = JSON.parse(fs.readFileSync(
      path.join(__dirname, '../config/experience-packs/child_se/exhibits.json'),
      'utf8'
    ));
    const errors = validateExhibitsFile(raw);
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.ok(Object.keys(raw.slot_types).length >= 3);
  });

  it('loader exposes memory_hall exhibit world with empty slots', () => {
    const pack = loadPack('child_se');
    const world = getExhibitWorldDef(pack, WORLD);
    assert.ok(world);
    assert.equal(world.slot_schema_version, 1);
    assert.deepEqual(world.slots, []);
  });

  it('buildExhibitViews returns empty array until slots authored', () => {
    const pack = loadPack('child_se');
    assert.deepEqual(buildExhibitViews(pack, WORLD), []);
  });

  it('garden path gates to memory_hall when memory_hall_playable allowed', async () => {
    const { injectMockDb } = require('./helpers/setup.js');
    const FEATURE = 'memory_hall_playable';
    const FAMILY = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    injectMockDb().setQuery(async (sql, params) => {
      const q = String(sql);
      if (q.includes('FROM features WHERE slug')) {
        return { rows: [{ slug: params[0], status: 'dev' }] };
      }
      if (q.includes('FROM family_features')) {
        return params[1] === FEATURE ? { rows: [{ family_id: FAMILY }] } : { rows: [] };
      }
      if (q.includes('has_component')) return { rows: [{ has_component: true }] };
      return { rows: [] };
    });

    const gardenPath = require.resolve('../src/lib/garden-playable');
    const accessPath = require.resolve('../src/lib/living-world-access');
    delete require.cache[gardenPath];
    delete require.cache[accessPath];
    const fresh = require('../src/lib/garden-playable');
    const state = await fresh.buildSceneState(CHILD_ID, FAMILY);
    const pathScenery = state.scenery.find((s) => s.scenery_id === 'garden_path');
    assert.equal(pathScenery.leads_to_memory_hall, true);
    assert.match(pathScenery.ambient_message, /minnen/i);
  });
});
