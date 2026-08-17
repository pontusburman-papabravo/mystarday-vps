'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const {
  computeBackfillPlan,
  backfillStandardLibrary,
  APPLY_AUTHORIZATION_STABLE_LEGACY_ID,
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

describe('stable-ID adversarial review', () => {
  const map = loadLegacyMap();
  const prod = createProdInventoryState();
  const nonLocalUrl = 'postgresql://user:secret@db.example.com:5432/backfill_target';

  function fullState() {
    return {
      activities: structuredClone(prod.activities),
      schedules: structuredClone(prod.schedules),
      scheduleItems: [],
      rewards: structuredClone(prod.rewards),
    };
  }

  it('1: primary UUID receives canonical write', () => {
    const state = fullState();
    const plan = computeBackfillPlan(state, map);
    const primary = plan.mappings.activities.find((m) => m.legacy_id === '04f83f52-8f56-4b43-a802-6a886c4835f0');
    assert.ok(primary.write);
    assert.equal(primary.canonical_id, 'wake_up');
    assert.equal(primary.apply_authorization, APPLY_AUTHORIZATION_STABLE_LEGACY_ID);
  });

  it('2: duplicate secondary UUID preserves without write', () => {
    const state = fullState();
    const plan = computeBackfillPlan(state, map);
    const secondary = plan.mappings.activities.find((m) => m.legacy_id === '4ef3f612-f3d2-4846-a1c6-6d7940899aef');
    assert.equal(secondary.classification, 'LEGACY_ROW_PRESERVE');
    assert.equal(secondary.write, null);
  });

  it('3: TEACCH UUID preserves without canonical write', () => {
    const state = fullState();
    const plan = computeBackfillPlan(state, map);
    const teacch = plan.mappings.activities.find((m) => m.legacy_id === '09131c4b-04ce-45e9-b8da-34087d2fe781');
    assert.equal(teacch.classification, 'TEACCH_OVERLAY');
    assert.equal(teacch.write, null);
    assert.equal(teacch.canonical_id, null);
  });

  it('4: non-standard UUID preserves without write', () => {
    const state = fullState();
    const plan = computeBackfillPlan(state, map);
    const nonStandard = plan.mappings.activities.find((m) => m.legacy_id === '543b9028-37b8-44ba-9eef-3b68dd501542');
    assert.equal(nonStandard.classification, 'NON_STANDARD_CONTENT');
    assert.equal(nonStandard.write, null);
  });

  it('5: preserve disposition is terminal — cannot fall through to name write', () => {
    const state = fullState();
    const preserveId = '4ef3f612-f3d2-4846-a1c6-6d7940899aef';
    state.activities.find((a) => a.id === preserveId).name = 'Renamed breakfast secondary';
    const plan = computeBackfillPlan(state, map);
    const mapping = plan.mappings.activities.find((m) => m.legacy_id === preserveId);
    assert.equal(mapping.classification, 'LEGACY_ROW_PRESERVE');
    assert.equal(mapping.write, null);
    assert.equal(plan.mappings.activities.filter((m) => m.write?.id === preserveId).length, 0);
  });

  it('6: unknown UUID cannot authorize non-local write via name', async () => {
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
      dryRun: false,
      map,
      databaseUrl: nonLocalUrl,
    });
    assert.equal(result.ok, false);
    assert.deepEqual(result.blockingErrors, [BACKFILL_REQUIRES_STABLE_LEGACY_IDS_ERROR]);
  });

  it('7: duplicate map legacy_id fails at load', () => {
    const mapFormat = 'my' + 'starday-standard-library-legacy-map';
    const { validateLegacyMapDeterminism } = require('../src/lib/standard-library-legacy-map');
    assert.throws(
      () => validateLegacyMapDeterminism({
        format: mapFormat,
        schema_version: 1,
        content_version: '1.1',
        activities: [
          { match: { legacy_id: prod.activities[0].id }, canonical_id: 'wake_up', classification: 'EXACT' },
          { match: { legacy_id: prod.activities[0].id }, canonical_id: 'wake_up', classification: 'EXACT' },
        ],
        schedules: [],
      }),
      /duplicate activity legacy_id/
    );
  });

  it('8: conflicting canonical target fails closed', () => {
    const state = fullState();
    state.activities.push({
      id: randomUUID(),
      name: 'Extra Vakna',
      package_component: null,
      sort_order: 99,
      canonical_id: null,
    });
    const conflictMap = structuredClone(map);
    conflictMap.activities.push({
      match: { legacy_id: state.activities.at(-1).id, legacy_name: 'Extra Vakna' },
      canonical_id: 'wake_up',
      classification: 'EXACT',
    });
    const plan = computeBackfillPlan(state, conflictMap);
    assert.equal(plan.ok, false);
    assert.ok(plan.blockingErrors.some((e) => /conflicting canonical_id assignment: wake_up/.test(e)));
  });

  it('9: already-applied correct canonical_id is idempotent', async () => {
    const state = fullState();
    for (const entry of map.activities) {
      if (!entry.match?.legacy_id || !entry.canonical_id) continue;
      if (entry.classification === 'TEACCH_OVERLAY'
        || entry.classification === 'LEGACY_ROW_PRESERVE'
        || entry.classification === 'NON_STANDARD_CONTENT') continue;
      const row = state.activities.find((a) => a.id === entry.match.legacy_id);
      if (row) row.canonical_id = entry.canonical_id;
    }
    for (const entry of map.schedules) {
      if (!entry.match?.legacy_id) continue;
      const row = state.schedules.find((s) => s.id === entry.match.legacy_id);
      if (row) row.canonical_id = entry.canonical_schedule_id;
    }
    const client = createBackfillMockClient(state);
    const result = await backfillStandardLibrary(client, {
      dryRun: false,
      map,
      databaseUrl: nonLocalUrl,
    });
    assert.equal(result.ok, true);
    assert.equal(result.plan.writes.length, 0);
    assert.equal(state.writes?.length || 0, 0);
  });

  it('10: wrong preexisting canonical_id on mapped row fails closed', () => {
    const state = fullState();
    state.activities.find((a) => a.id === '200f451a-e927-4e9b-b093-fbec37bfe804').canonical_id = 'snack';
    const plan = computeBackfillPlan(state, map);
    assert.equal(plan.ok, false);
    assert.ok(plan.blockingErrors.some((e) => /200f451a.*expected breakfast/.test(e)));
  });

  it('11: preserve row with unexpected canonical_id fails closed', () => {
    const state = fullState();
    state.activities.find((a) => a.id === '4ef3f612-f3d2-4846-a1c6-6d7940899aef').canonical_id = 'breakfast';
    const plan = computeBackfillPlan(state, map);
    assert.equal(plan.ok, false);
    assert.ok(plan.blockingErrors.some((e) => /preserve row.*already has canonical_id/.test(e)));
  });

  it('12: eight schedule canonical targets are duplicate-free', () => {
    const state = fullState();
    const plan = computeBackfillPlan(state, map);
    const scheduleWrites = plan.writes.filter((w) => w.table === 'default_schedule');
    assert.equal(scheduleWrites.length, 8);
    const ids = scheduleWrites.map((w) => w.canonical_id);
    assert.equal(new Set(ids).size, 8);
  });

  it('13: no preserve rows appear in plan.writes', () => {
    const state = fullState();
    const plan = computeBackfillPlan(state, map);
    const preserveIds = new Set(
      plan.mappings.activities
        .filter((m) => m.classification === 'TEACCH_OVERLAY'
          || m.classification === 'LEGACY_ROW_PRESERVE'
          || m.classification === 'NON_STANDARD_CONTENT')
        .map((m) => m.legacy_id)
    );
    for (const write of plan.writes) {
      assert.equal(preserveIds.has(write.id), false);
    }
  });

  it('14: activity disposition sums to 47', () => {
    const state = fullState();
    const plan = computeBackfillPlan(state, map);
    const canonical = plan.mappings.activities.filter((m) => m.write).length;
    const teacch = plan.mappings.activities.filter((m) => m.classification === 'TEACCH_OVERLAY').length;
    const legacy = plan.mappings.activities.filter((m) => m.classification === 'LEGACY_ROW_PRESERVE').length;
    const nonStandard = plan.mappings.activities.filter((m) => m.classification === 'NON_STANDARD_CONTENT').length;
    assert.equal(canonical + teacch + legacy + nonStandard, 47);
    assert.equal(canonical, 22);
    assert.equal(teacch, 3);
    assert.equal(legacy, 6);
    assert.equal(nonStandard, 16);
  });

  it('15: stable UUID with metadata mismatch still applies disposition', () => {
    const state = fullState();
    const teacchId = '09131c4b-04ce-45e9-b8da-34087d2fe781';
    state.activities.find((a) => a.id === teacchId).package_component = null;
    const plan = computeBackfillPlan(state, map);
    const mapping = plan.mappings.activities.find((m) => m.legacy_id === teacchId);
    assert.equal(mapping.classification, 'TEACCH_OVERLAY');
    assert.equal(mapping.metadata_mismatch, true);
    assert.equal(mapping.write, null);
  });
});

describe('stable-ID adversarial CLI contract', () => {
  const { execFileSync } = require('child_process');
  const path = require('path');
  const ROOT = path.join(__dirname, '..');

  it('dry-run is default and apply confirm guard documented', () => {
    const out = execFileSync(process.execPath, ['scripts/backfill-standard-library.js', '--help'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.match(out, /--dry-run/i);
    assert.match(out, /STANDARD_LIBRARY_BACKFILL_CONFIRM/i);
    assert.match(out, /stable legacy row UUID/i);
  });
});
