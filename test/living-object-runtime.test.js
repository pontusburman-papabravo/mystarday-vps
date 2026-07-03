'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { injectMockDb } = require('./helpers/setup.js');
const { clearPackCache, loadPack } = require('../src/lib/experience-pack');

const CHILD_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const FAMILY_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const GARDEN = 'garden';
const BED_SLOT = 'bed_1';

function loadRuntime() {
  const dbPath = require.resolve('../src/lib/db');
  const livingDbPath = require.resolve('../db/living-object');
  const modPath = require.resolve('../src/lib/living-object-runtime');
  delete require.cache[modPath];
  delete require.cache[livingDbPath];
  if (require.cache[dbPath]) {
    // keep injectMockDb mock in place
  }
  return require(modPath);
}

describe('living-object-runtime — garden sunflower loop', () => {
  beforeEach(() => clearPackCache());

  it('loadLivingSlots returns virtual empty slot without DB row', async () => {
    const mock = injectMockDb();
    mock.setQuery(async (sql) => {
      if (String(sql).includes('living_object_instance')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const { loadLivingSlots } = loadRuntime();
    const pack = loadPack('child_se');
    const slots = await loadLivingSlots({ childId: CHILD_ID, worldSlug: GARDEN, pack });

    assert.equal(slots.length, 1);
    assert.equal(slots[0].slot_id, BED_SLOT);
    assert.equal(slots[0].state_key, 'empty');
    assert.equal(slots[0].instance_id, null);
    assert.equal(slots[0].available_verbs.length, 1);
    assert.equal(slots[0].available_verbs[0].verb, 'plant');
  });

  it('applyVerb plant creates instance in planted state with timer', async () => {
    const rows = [];
    const mock = injectMockDb();
    mock.setQuery(async (sql, params) => {
      const q = String(sql);
      if (q.includes('SELECT') && q.includes('living_object_instance')) {
        const slotId = params[2];
        const hit = rows.find((r) => r.child_id === CHILD_ID && r.slot_id === slotId);
        return { rows: hit ? [hit] : [] };
      }
      if (q.includes('INSERT INTO living_object_instance')) {
        const row = {
          id: '11111111-1111-1111-1111-111111111111',
          child_id: params[0],
          family_id: params[1],
          world_slug: params[2],
          archetype_id: params[3],
          slot_id: params[4],
          state_key: params[5],
          state_data: JSON.parse(params[6]),
          version: 1,
        };
        rows.push(row);
        return { rows: [row] };
      }
      if (q.includes('UPDATE living_object_instance')) {
        const row = rows.find((r) => r.id === params[2]);
        if (!row || row.version !== params[3]) {
          return { rows: [] };
        }
        row.state_key = params[0];
        row.state_data = JSON.parse(params[1]);
        row.version += 1;
        return { rows: [row] };
      }
      return { rows: [] };
    });

    const { applyVerb } = loadRuntime();
    const pack = loadPack('child_se');
    const result = await applyVerb({
      childId: CHILD_ID,
      familyId: FAMILY_ID,
      worldSlug: GARDEN,
      slotId: BED_SLOT,
      verb: 'plant',
      pack,
    });

    assert.equal(result.ok, true);
    assert.equal(result.slot.state_key, 'planted');
    assert.ok(result.slot.timer_remaining_ms > 0);
    assert.match(result.child_message_sv, /frö/i);
  });

  it('applyVerb rejects invalid verb for current state', async () => {
    const mock = injectMockDb();
    mock.setQuery(async (sql) => {
      if (String(sql).includes('living_object_instance')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const { applyVerb } = loadRuntime();
    const pack = loadPack('child_se');
    const result = await applyVerb({
      childId: CHILD_ID,
      familyId: FAMILY_ID,
      worldSlug: GARDEN,
      slotId: BED_SLOT,
      verb: 'harvest',
      pack,
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'verb_not_allowed');
  });
});
