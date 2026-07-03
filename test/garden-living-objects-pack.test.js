'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  loadPack,
  clearPackCache,
  getLivingWorldDef,
  getLivingArchetype,
  getWorldDef,
} = require('../src/lib/experience-pack');

const GARDEN_WORLD = 'garden';
const SUNFLOWER = 'sunflower';
const REQUIRED_STATES = ['empty', 'planted', 'blooming', 'harvested'];

function validateLivingObjectsFile(raw) {
  const errors = [];
  for (const world of raw.worlds || []) {
    if (!world.world_slug) errors.push('world missing world_slug');
    for (const archetype of world.archetypes || []) {
      if (!archetype.archetype_id) errors.push('archetype missing archetype_id');
      const stateKeys = new Set((archetype.states || []).map((s) => s.state_key));
      if (archetype.initial_state && !stateKeys.has(archetype.initial_state)) {
        errors.push(`${archetype.archetype_id}: initial_state not in states`);
      }
      for (const verb of archetype.verbs || []) {
        if (!stateKeys.has(verb.from_state) || !stateKeys.has(verb.to_state)) {
          errors.push(`${archetype.archetype_id}: verb ${verb.verb} references unknown state`);
        }
      }
      for (const state of archetype.states || []) {
        if (state.timer_ms != null && !state.timer_next_state) {
          errors.push(`${archetype.archetype_id}: state ${state.state_key} has timer without timer_next_state`);
        }
        if (state.timer_next_state && !stateKeys.has(state.timer_next_state)) {
          errors.push(`${archetype.archetype_id}: timer_next_state ${state.timer_next_state} missing`);
        }
      }
    }
  }
  return errors;
}

describe('garden living-objects pack (S0-2)', () => {
  beforeEach(() => clearPackCache());

  it('manifest includes living-objects.json on disk', () => {
    const packPath = path.join(__dirname, '../config/experience-packs/child_se');
    const manifest = JSON.parse(fs.readFileSync(path.join(packPath, 'manifest.json'), 'utf8'));
    assert.equal(manifest.includes.living_objects, 'living-objects.json');
    assert.ok(fs.existsSync(path.join(packPath, 'living-objects.json')));
  });

  it('on-disk living-objects.json passes structural validation', () => {
    const raw = JSON.parse(fs.readFileSync(
      path.join(__dirname, '../config/experience-packs/child_se/living-objects.json'),
      'utf8'
    ));
    const errors = validateLivingObjectsFile(raw);
    assert.equal(errors.length, 0, errors.join('\n'));
  });

  it('loader exposes garden world + sunflower archetype', () => {
    const pack = loadPack('child_se');
    const world = getLivingWorldDef(pack, GARDEN_WORLD);
    assert.ok(world, 'garden living world def missing');
    assert.equal(world.display_name_sv, 'Trädgården');
    assert.ok(world.slots.some((s) => s.slot_id === 'bed_1'));

    const archetype = getLivingArchetype(pack, GARDEN_WORLD, SUNFLOWER);
    assert.ok(archetype, 'sunflower archetype missing');
    assert.equal(archetype.initial_state, 'empty');
    assert.deepEqual(archetype.states.map((s) => s.state_key), REQUIRED_STATES);
  });

  it('sunflower verbs and planted timer are defined', () => {
    const pack = loadPack('child_se');
    const archetype = getLivingArchetype(pack, GARDEN_WORLD, SUNFLOWER);
    const plant = archetype.verbs.find((v) => v.verb === 'plant');
    const harvest = archetype.verbs.find((v) => v.verb === 'harvest');
    assert.equal(plant.from_state, 'empty');
    assert.equal(plant.to_state, 'planted');
    assert.equal(harvest.from_state, 'blooming');
    assert.equal(harvest.to_state, 'harvested');

    const planted = archetype.states.find((s) => s.state_key === 'planted');
    assert.equal(planted.timer_ms, 30000);
    assert.equal(planted.timer_next_state, 'blooming');
  });

  it('worlds.json has garden display metadata', () => {
    const pack = loadPack('child_se');
    const world = getWorldDef(pack, GARDEN_WORLD);
    assert.ok(world);
    assert.equal(world.display_name_sv, 'Trädgården');
    assert.match(world.first_unlock_message, /Trädgården/);
  });

  it('worlds.json living_slot_id references living-objects slot + archetype (BL-034)', () => {
    const pack = loadPack('child_se');
    const world = getWorldDef(pack, GARDEN_WORLD);
    const livingWorld = getLivingWorldDef(pack, GARDEN_WORLD);
    assert.ok(livingWorld, 'garden living world def required when living_slot_id used');

    const slotById = new Map((livingWorld.slots || []).map((s) => [s.slot_id, s]));
    const archetypeIds = new Set((livingWorld.archetypes || []).map((a) => a.archetype_id));

    for (const scenery of world.ambient_scenery || []) {
      if (!scenery.living_slot_id) continue;
      const slot = slotById.get(scenery.living_slot_id);
      assert.ok(slot, `living_slot_id ${scenery.living_slot_id} missing from living-objects slots`);
      assert.ok(
        archetypeIds.has(slot.default_archetype_id),
        `slot ${scenery.living_slot_id} default_archetype_id ${slot.default_archetype_id} unknown`
      );
      assert.ok(scenery.hotspot_class, `scenery ${scenery.scenery_id} with living_slot needs hotspot_class`);
    }

    const bed = (world.ambient_scenery || []).find((s) => s.living_slot_id === 'bed_1');
    assert.ok(bed, 'garden bed scenery with bed_1 living_slot_id required');
    assert.equal(bed.scenery_id, 'garden_bed');
  });
});
