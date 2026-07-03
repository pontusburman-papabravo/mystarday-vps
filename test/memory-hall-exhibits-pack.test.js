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

  it('garden has no memory_hall gate until BL-012 entry decision', () => {
    const pack = loadPack('child_se');
    const { getWorldDef } = require('../src/lib/experience-pack');
    const garden = getWorldDef(pack, 'garden');
    for (const scenery of garden.ambient_scenery || []) {
      assert.notEqual(scenery.gate_to_world, 'memory_hall');
    }
    const morgonhus = getWorldDef(pack, 'routine_home');
    for (const prop of morgonhus.ambient_props || []) {
      assert.notEqual(prop.gate_to_world, 'memory_hall');
    }
  });
});
