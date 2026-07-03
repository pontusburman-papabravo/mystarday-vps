'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { injectMockDb } = require('./helpers/setup.js');
const { loadPack, getWorldDef } = require('../src/lib/experience-pack');
const {
  resolveAmbientGate,
  buildSceneryFromPack,
  ambientPropToSceneProp,
} = require('../src/lib/world-ambient');

const FAMILY_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('world-ambient — shared pack helpers', () => {
  it('buildSceneryFromPack maps ambient_scenery fields', () => {
    const pack = loadPack('child_se');
    const world = getWorldDef(pack, 'garden');
    const scenery = buildSceneryFromPack(world);
    assert.ok(scenery.some((s) => s.scenery_id === 'garden_bed'));
    const bed = scenery.find((s) => s.scenery_id === 'garden_bed');
    assert.equal(bed.living_slot_id, 'bed_1');
    assert.equal(bed.hotspot_class, 'gd-hotspot--bed');
  });

  it('ambientPropToSceneProp sets leads_to_garden when gate open', () => {
    const prop = ambientPropToSceneProp(
      {
        prop_id: 'door',
        label_sv: 'Dörren',
        always_active: true,
        gate_to_world: 'garden',
      },
      { gated: true, message: 'Utanför väntar trädgården…', leads_to_world: 'garden' }
    );
    assert.equal(prop.leads_to_garden, true);
    assert.equal(prop.leads_to_world, 'garden');
  });

  it('resolveAmbientGate denied without feature access', async () => {
    injectMockDb().setQuery(async () => ({ rows: [] }));
    const gate = await resolveAmbientGate(FAMILY_A, {
      prop_id: 'door',
      gate_to_world: 'garden',
      gate_feature_slug: 'garden_playable',
      ambient_message_sv: 'Dörren skakar.',
    }, new Map());
    assert.equal(gate.gated, false);
    assert.match(gate.message, /Dörren skakar/);
  });
});
