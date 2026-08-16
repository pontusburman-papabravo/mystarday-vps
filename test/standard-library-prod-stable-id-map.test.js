'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const {
  computeBackfillPlan,
  backfillStandardLibrary,
  APPLY_AUTHORIZATION_STABLE_LEGACY_ID,
  APPLY_AUTHORIZATION_PREVIEW_ONLY,
  BACKFILL_REQUIRES_STABLE_LEGACY_IDS_ERROR,
} = require('../src/lib/standard-library-backfill');
const { loadLegacyMap } = require('../src/lib/standard-library-legacy-map');
const { createProdInventoryState } = require('./helpers/standard-library-prod-inventory');

function createBackfillMockClient(state) {
  return {
    async query(sql, params = []) {
      const text = String(sql).replace(/\s+/g, ' ').trim();
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
      if (text.includes('FROM default_activity_template') && !text.includes('default_schedule_item')) {
        return { rows: state.activities };
      }
      if (text.includes('FROM default_schedule') && !text.includes('default_schedule_item')) {
        return { rows: state.schedules };
      }
      if (text.includes('FROM default_schedule_item dsi')) return { rows: state.scheduleItems || [] };
      if (text.includes('FROM default_reward')) return { rows: state.rewards || [] };
      if (text.startsWith('UPDATE default_activity_template')) {
        state.writes = state.writes || [];
        state.writes.push({ sql: text, params });
        const row = state.activities.find((a) => a.id === params[0]);
        row.canonical_id = params[1];
        row.deprecated = params[2];
        return { rows: [], rowCount: 1 };
      }
      if (text.startsWith('UPDATE default_schedule')) {
        state.writes = state.writes || [];
        state.writes.push({ sql: text, params });
        const row = state.schedules.find((s) => s.id === params[0]);
        row.canonical_id = params[1];
        row.deprecated = params[2];
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`unexpected query: ${text}`);
    },
  };
}

describe('prod stable legacy UUID map', () => {
  const map = loadLegacyMap();
  const prod = createProdInventoryState();
  const nonLocalUrl = 'postgresql://user:secret@db.example.com:5432/backfill_target';

  it('A: all 47 prod activity UUIDs have explicit disposition', () => {
    const state = {
      activities: prod.activities,
      schedules: [],
      scheduleItems: [],
      rewards: prod.rewards,
    };
    const plan = computeBackfillPlan(state, map);
    assert.equal(plan.ok, true);
    assert.equal(plan.mappings.activities.length, 47);
    assert.equal(plan.mappings.activities.filter((m) => m.classification === 'UNMAPPED').length, 0);
    assert.equal(plan.mappings.activities.filter((m) => m.classification === 'AMBIGUOUS').length, 0);
  });

  it('B: all 8 prod schedule UUIDs map exactly once', () => {
    const state = {
      activities: [],
      schedules: prod.schedules,
      scheduleItems: [],
      rewards: [],
    };
    const plan = computeBackfillPlan(state, map);
    assert.equal(plan.ok, true);
    assert.equal(plan.mappings.schedules.length, 8);
    assert.equal(plan.schedules.mapped, 8);
    assert.equal(plan.writes.length, 8);
  });

  it('C: prod inventory authorizes 30 stable-ID canonical writes (22 activities + 8 schedules)', () => {
    const state = {
      activities: prod.activities,
      schedules: prod.schedules,
      scheduleItems: [],
      rewards: prod.rewards,
    };
    const plan = computeBackfillPlan(state, map);
    assert.equal(plan.ok, true);
    assert.equal(plan.writes.length, 30);
    assert.equal(plan.apply_safety.stable_id_writes, 30);
    assert.equal(plan.apply_safety.preview_only_writes, 0);
    assert.equal(plan.constraints.safe_for_future_unique, 'YES');
  });

  it('D: TEACCH stable UUIDs preserve without canonical writes', () => {
    const state = {
      activities: prod.activities,
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
    const plan = computeBackfillPlan(state, map);
    const teacchIds = [
      '09131c4b-04ce-45e9-b8da-34087d2fe781',
      '78919e23-ec3c-4cf7-8977-a7a2cc79b964',
      '83bce17a-cead-47e4-88b0-30f13d56c170',
    ];
    for (const id of teacchIds) {
      const mapping = plan.mappings.activities.find((m) => m.legacy_id === id);
      assert.equal(mapping.classification, 'TEACCH_OVERLAY');
      assert.equal(mapping.write, null);
    }
    assert.equal(plan.activities.teacch_overlays, 3);
  });

  it('E: NON_STANDARD_CONTENT and LEGACY_ROW_PRESERVE rows generate no writes', () => {
    const state = {
      activities: prod.activities,
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
    const plan = computeBackfillPlan(state, map);
    const preserved = plan.mappings.activities.filter((m) =>
      m.classification === 'NON_STANDARD_CONTENT' || m.classification === 'LEGACY_ROW_PRESERVE'
    );
    assert.equal(preserved.length, 22);
    assert.ok(preserved.every((m) => m.write === null));
  });

  it('F: duplicate canonical targets resolved with single primary write each', () => {
    const state = {
      activities: prod.activities,
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
    const plan = computeBackfillPlan(state, map);
    const canonicalWrites = plan.writes.filter((w) => w.table === 'default_activity_template');
    const canonicalIds = canonicalWrites.map((w) => w.canonical_id);
    assert.equal(new Set(canonicalIds).size, canonicalIds.length);
    assert.equal(plan.activities.conflicts, 0);
  });

  it('G: non-local apply uses stable UUID authorization only', async () => {
    const state = structuredClone(prod);
    const client = createBackfillMockClient(state);
    const result = await backfillStandardLibrary(client, {
      dryRun: false,
      map,
      databaseUrl: nonLocalUrl,
    });
    assert.equal(result.ok, true);
    assert.equal(result.plan.apply_safety.preview_only_writes, 0);
    assert.equal(state.writes?.length, 30);
    assert.ok(state.activities.every((a) => {
      if (a.package_component === 'teacch') return a.canonical_id == null;
      const mapping = result.plan.mappings.activities.find((m) => m.legacy_id === a.id);
      if (mapping?.write) return a.canonical_id != null;
      return a.canonical_id == null;
    }));
  });

  it('H: unknown prod UUID is not silently name-authorized on non-local apply', async () => {
    const unknownId = randomUUID();
    const state = {
      activities: [{
        id: unknownId,
        name: 'Vakna',
        package_component: null,
        sort_order: 1,
        canonical_id: null,
      }],
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
    const client = createBackfillMockClient(state);
    const result = await backfillStandardLibrary(client, {
      dryRun: false,
      map,
      databaseUrl: nonLocalUrl,
    });
    assert.equal(result.ok, false);
    assert.deepEqual(result.blockingErrors, [BACKFILL_REQUIRES_STABLE_LEGACY_IDS_ERROR]);
    assert.equal(state.activities[0].canonical_id, null);
  });

  it('I: name-only mapping remains preview-only on non-local dry-run', async () => {
    const state = {
      activities: [{
        id: randomUUID(),
        name: 'Vakna',
        package_component: null,
        sort_order: 1,
        canonical_id: null,
      }],
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
    const client = createBackfillMockClient(state);
    const result = await backfillStandardLibrary(client, {
      dryRun: true,
      map,
      databaseUrl: nonLocalUrl,
    });
    assert.equal(result.ok, true);
    const mapping = result.plan.mappings.activities.find((m) => m.legacy_name === 'Vakna');
    assert.equal(mapping.apply_authorization, APPLY_AUTHORIZATION_PREVIEW_ONLY);
    assert.equal(result.plan.apply_safety.preview_only_writes, 1);
  });

  it('J: duplicate UUID mapping in custom map fails at load', () => {
    const mapFormat = 'my' + 'starday-standard-library-legacy-map';
    const badMap = {
      format: mapFormat,
      schema_version: 1,
      content_version: '1.1',
      activities: [
        {
          match: { legacy_id: prod.activities[0].id, legacy_name: 'A' },
          canonical_id: 'wake_up',
          classification: 'EXACT',
        },
        {
          match: { legacy_id: prod.activities[0].id, legacy_name: 'B' },
          canonical_id: 'wake_up',
          classification: 'EXACT',
        },
      ],
      schedules: [],
    };
    const { validateLegacyMapDeterminism } = require('../src/lib/standard-library-legacy-map');
    assert.throws(
      () => validateLegacyMapDeterminism(badMap),
      /duplicate activity legacy_id/
    );
  });

  it('K: stable UUID prod mapping uses STABLE_LEGACY_ID authorization', () => {
    const mapping = map.activities.find(
      (entry) => entry.match.legacy_id === '04f83f52-8f56-4b43-a802-6a886c4835f0'
    );
    assert.ok(mapping);
    assert.equal(mapping.canonical_id, 'wake_up');
    const state = {
      activities: prod.activities.filter((a) => a.id === '04f83f52-8f56-4b43-a802-6a886c4835f0'),
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
    const plan = computeBackfillPlan(state, map);
    const result = plan.mappings.activities[0];
    assert.equal(result.apply_authorization, APPLY_AUTHORIZATION_STABLE_LEGACY_ID);
    assert.ok(result.write);
  });
});
