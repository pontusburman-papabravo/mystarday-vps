'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { injectMockDb } = require('./helpers/setup.js');
const { loadPack, getWorldDef } = require('../src/lib/experience-pack');

const FAMILY_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function loadAmbient() {
  const ambientPath = require.resolve('../src/lib/world-ambient');
  const accessPath = require.resolve('../src/lib/living-world-access');
  const featuresPath = require.resolve('../db/features');
  delete require.cache[ambientPath];
  delete require.cache[accessPath];
  delete require.cache[featuresPath];
  return require('../src/lib/world-ambient');
}

describe('world-ambient — shared pack helpers', () => {
  it('buildSceneryFromPack maps ambient_scenery fields', () => {
    const { buildSceneryFromPack } = loadAmbient();
    const pack = loadPack('child_se');
    const world = getWorldDef(pack, 'garden');
    const scenery = buildSceneryFromPack(world);
    assert.ok(scenery.some((s) => s.scenery_id === 'garden_bed'));
    const bed = scenery.find((s) => s.scenery_id === 'garden_bed');
    assert.equal(bed.living_slot_id, 'bed_1');
    assert.equal(bed.hotspot_class, 'gd-hotspot--bed');
  });

  it('ambientPropToSceneProp sets leads_to_garden when gate open', () => {
    const { ambientPropToSceneProp } = loadAmbient();
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
    const { resolveAmbientGate } = loadAmbient();
    const gate = await resolveAmbientGate(FAMILY_A, {
      prop_id: 'door',
      gate_to_world: 'garden',
      gate_feature_slug: 'garden_playable',
      ambient_message_sv: 'Dörren skakar.',
    }, new Map());
    assert.equal(gate.gated, false);
    assert.match(gate.message, /Dörren skakar/);
  });

  it('resolveAmbientGate opens garden path to memory_hall when allowed', async () => {
    injectMockDb().setQuery(async (sql, params) => {
      const q = String(sql);
      if (q.includes('FROM features WHERE slug')) {
        return { rows: [{ slug: params[0], status: 'dev' }] };
      }
      if (q.includes('FROM family_features')) {
        return { rows: [{ family_id: FAMILY_A }] };
      }
      if (q.includes('has_component')) return { rows: [{ has_component: true }] };
      return { rows: [] };
    });

    const { resolveAmbientGate } = loadAmbient();
    const gate = await resolveAmbientGate(FAMILY_A, {
      scenery_id: 'garden_path',
      gate_to_world: 'memory_hall',
      gate_feature_slug: 'memory_hall_playable',
      ambient_message_sv: 'Stigen leder längre in.',
      gate_message_sv: 'Stigen leder till ett varmt rum…',
    }, new Map());

    assert.equal(gate.gated, true);
    assert.equal(gate.leads_to_world, 'memory_hall');
  });
});
