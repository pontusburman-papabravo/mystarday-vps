'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const {
  computeBackfillPlan,
  applyBackfillPlan,
  backfillStandardLibrary,
  detectDuplicateCanonicalIds,
  BACKFILL_REQUIRES_STABLE_LEGACY_IDS_ERROR,
  APPLY_AUTHORIZATION_PREVIEW_ONLY,
} = require('../src/lib/standard-library-backfill');
const { loadLegacyMap } = require('../src/lib/standard-library-legacy-map');
const {
  syncStandardLibrary,
  buildDesiredStateFromManifest,
  computeSyncPlan,
  readCurrentCanonicalState,
} = require('../src/lib/standard-library-sync');
const { readManifestFile, DEFAULT_MANIFEST_PATH } = require('../src/lib/standard-library-manifest');
const { createProdLikeLegacyFixture } = require('./helpers/standard-library-legacy-fixture');
const { setupTestDb } = require('./helpers/setup.js');

function cloneManifest() {
  return structuredClone(readManifestFile(DEFAULT_MANIFEST_PATH));
}

function createBackfillMockClient(state) {
  return {
    async query(sql, params = []) {
      const text = String(sql).replace(/\s+/g, ' ').trim();

      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return { rows: [] };
      }

      if (text.includes('FROM default_activity_template') && !text.includes('default_schedule_item')) {
        return { rows: state.activities };
      }
      if (text.includes('FROM default_schedule') && !text.includes('default_schedule_item')) {
        return { rows: state.schedules };
      }
      if (text.includes('FROM default_schedule_item dsi')) {
        return { rows: state.scheduleItems };
      }
      if (text.includes('FROM default_reward')) {
        return { rows: state.rewards };
      }

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

describe('standard library backfill mapping', () => {
  const map = loadLegacyMap();
  const fixture = createProdLikeLegacyFixture();

  it('A: explicit safe activity mapping assigns canonical_id', () => {
    const state = {
      activities: [{ id: 'a1', name: 'Vakna', package_component: null, sort_order: 1, canonical_id: null }],
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
    const plan = computeBackfillPlan(state, map);
    const mapping = plan.mappings.activities.find((m) => m.legacy_id === 'a1');
    assert.equal(mapping.canonical_id, 'wake_up');
    assert.equal(mapping.classification, 'SAFE_EXPLICIT_MAPPING');
    assert.ok(mapping.write);
  });

  it('B: explicit schedule mapping assigns canonical schedule identity', () => {
    const state = {
      activities: [],
      schedules: [{ id: 's1', name: 'Förskola vardag', canonical_id: null }],
      scheduleItems: [],
      rewards: [],
    };
    const plan = computeBackfillPlan(state, map);
    const mapping = plan.mappings.schedules.find((m) => m.legacy_id === 's1');
    assert.equal(mapping.canonical_id, 'preschool_weekday');
    assert.equal(mapping.classification, 'EXACT');
  });

  it('C: display name change after canonical assignment does not affect sync identity', async () => {
    const manifest = cloneManifest();
    const desired = buildDesiredStateFromManifest(manifest);
    const current = {
      activities: [{
        id: '1',
        canonical_id: 'brush_teeth',
        name: 'Helt nytt namn',
        name_i18n: { sv: 'Helt nytt namn', 'en-GB': 'Totally new' },
        icon_key: 'brush_teeth',
        icon: '🪥',
        star_value: 1,
        duration_seconds: null,
        sub_steps: desired.activities.find((a) => a.canonical_id === 'brush_teeth').sub_steps,
        variants: [],
        seven_questions: {},
        deprecated: false,
        sort_order: 0,
      }],
      schedules: [],
      scheduleItems: [],
    };
    const plan = computeSyncPlan(desired, current);
    assert.equal(plan.summary.activities.updates, 1);
    assert.equal(plan.summary.activities.inserts, 30);
    assert.equal(plan.summary.activities.conflicts, 0);
  });

  it('D: ambiguous duplicate legacy names fail closed', () => {
    const state = {
      activities: [
        { id: 'a1', name: 'Mellanmål', package_component: null, sort_order: 1, canonical_id: null },
        { id: 'a2', name: 'Mellanmål', package_component: null, sort_order: 2, canonical_id: null },
      ],
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
    const plan = computeBackfillPlan(state, map);
    assert.equal(plan.ok, false);
    assert.ok(plan.blockingErrors.some((e) => /ambiguous/i.test(e)));
  });

  it('E: duplicate non-null canonical_id fails closed', () => {
    const dupes = detectDuplicateCanonicalIds([
      { id: '1', canonical_id: 'wake_up' },
      { id: '2', canonical_id: 'wake_up' },
    ]);
    assert.equal(dupes.hasDuplicates, true);
    const state = {
      activities: [
        { id: '1', canonical_id: 'wake_up', name: 'A' },
        { id: '2', canonical_id: 'wake_up', name: 'B' },
      ],
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
    const plan = computeBackfillPlan(state, map);
    assert.equal(plan.ok, false);
  });

  it('F: unknown legacy activity preserved as unmapped', () => {
    const state = {
      activities: [{ id: 'x1', name: 'Förskola/Skola', package_component: null, canonical_id: null }],
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
    const plan = computeBackfillPlan(state, map);
    const mapping = plan.mappings.activities.find((m) => m.legacy_id === 'x1');
    assert.equal(mapping.classification, 'UNMAPPED');
    assert.equal(mapping.write, null);
  });

  it('G: TEACCH brush teeth does not receive canonical assignment', () => {
    const state = {
      activities: [
        { id: 't1', name: 'Borsta tänderna', package_component: 'teacch', canonical_id: null },
        { id: 'r1', name: 'Borsta tänderna', package_component: null, canonical_id: null },
      ],
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
    const plan = computeBackfillPlan(state, map);
    const teacch = plan.mappings.activities.find((m) => m.legacy_id === 't1');
    const regular = plan.mappings.activities.find((m) => m.legacy_id === 'r1');
    assert.equal(teacch.classification, 'TEACCH_OVERLAY');
    assert.equal(teacch.write, null);
    assert.equal(regular.canonical_id, 'brush_teeth');
    assert.ok(regular.write);
  });

  it('H: dry-run performs zero writes', async () => {
    const state = createProdLikeLegacyFixture();
    const client = createBackfillMockClient(state);
    const result = await backfillStandardLibrary(client, { dryRun: true });
    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);
    assert.equal(state.writes?.length || 0, 0);
  });

  it('I: apply failure rolls back transaction', async () => {
    const state = {
      activities: [{ id: 'a1', name: 'Vakna', package_component: null, canonical_id: null }],
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
    let snapshot = null;
    const client = {
      async query(sql) {
        const text = String(sql).replace(/\s+/g, ' ').trim();
        if (text === 'BEGIN') {
          snapshot = structuredClone(state);
          return { rows: [] };
        }
        if (text === 'ROLLBACK') {
          if (snapshot) {
            state.activities = snapshot.activities;
            snapshot = null;
          }
          return { rows: [] };
        }
        if (text === 'COMMIT') throw new Error('injected failure');
        if (text.includes('FROM default_activity_template')) return { rows: state.activities };
        if (text.includes('FROM default_schedule') && !text.includes('item')) return { rows: [] };
        if (text.includes('FROM default_schedule_item')) return { rows: [] };
        if (text.includes('FROM default_reward')) return { rows: [] };
        if (text.startsWith('UPDATE default_activity_template')) {
          state.activities[0].canonical_id = 'wake_up';
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`unexpected: ${text}`);
      },
    };
    const plan = computeBackfillPlan(state, loadLegacyMap());
    await assert.rejects(
      () => applyBackfillPlan(client, plan, { databaseUrl: 'postgresql://localhost/stjarndag' }),
      /injected failure/
    );
    assert.equal(state.activities[0].canonical_id, null);
  });
});

describe('standard library backfill + sync simulation', () => {
  it('prod-like fixture reports documented counts', () => {
    const fixture = createProdLikeLegacyFixture();
    assert.equal(fixture.counts.activities, 30);
    assert.equal(fixture.counts.schedules, 8);
    assert.equal(fixture.counts.rewards, 17);
    assert.ok(fixture.counts.scheduleItems >= 85);
  });

  it('J/K/L/M: controlled backfill apply + canonical sync + idempotent second sync', async () => {
    const fixture = createProdLikeLegacyFixture();
    const state = structuredClone(fixture);
    const client = createBackfillMockClient(state);
    const manifest = cloneManifest();

    const dry = await backfillStandardLibrary(client, { dryRun: true });
    assert.equal(dry.ok, true);

    const applied = await backfillStandardLibrary(client, { dryRun: false });
    assert.equal(applied.ok, true);
    assert.ok(applied.plan.writes.length > 0);

    const teacchRows = state.activities.filter((a) => a.package_component === 'teacch');
    assert.ok(teacchRows.every((row) => row.canonical_id == null));

    const desired = buildDesiredStateFromManifest(manifest);
    const desiredActivityByCanonical = new Map(
      desired.activities.map((activity) => [activity.canonical_id, activity])
    );
    const desiredScheduleByCanonical = new Map(
      desired.schedules.map((schedule) => [schedule.canonical_id, schedule])
    );

    const syncStore = {
      activities: state.activities.map((activity) => {
        const canonical = desiredActivityByCanonical.get(activity.canonical_id);
        if (canonical) {
          return { ...canonical, id: activity.id, package_component: activity.package_component };
        }
        return {
          ...activity,
          name_i18n: { sv: activity.name, 'en-GB': activity.name },
          icon_key: null,
          duration_seconds: null,
          variants: [],
          seven_questions: activity.seven_questions || {},
          sub_steps: [],
          deprecated: false,
        };
      }),
      schedules: state.schedules.map((schedule) => {
        const canonical = desiredScheduleByCanonical.get(schedule.canonical_id);
        if (canonical) {
          return { ...canonical, id: schedule.id };
        }
        return {
          ...schedule,
          name_i18n: { sv: schedule.name, 'en-GB': schedule.name },
          description_i18n: { sv: schedule.description, 'en-GB': schedule.description },
          deprecated: false,
        };
      }),
      scheduleItems: [],
      writes: [],
    };

    const syncClient = {
      async query(sql, params = []) {
        const text = String(sql).replace(/\s+/g, ' ').trim();
        if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
        if (text.includes('FROM default_activity_template') && text.includes('canonical_id IS NOT NULL')) {
          return { rows: syncStore.activities.filter((a) => a.canonical_id) };
        }
        if (text.includes('FROM default_schedule') && text.includes('canonical_id IS NOT NULL') && !text.includes('item')) {
          return { rows: syncStore.schedules.filter((s) => s.canonical_id) };
        }
        if (text.includes('FROM default_schedule_item dsi')) {
          return {
            rows: syncStore.scheduleItems.map((item) => ({
              id: item.id,
              default_schedule_id: item.default_schedule_id,
              default_activity_template_id: item.default_activity_template_id,
              name: item.name,
              icon: item.icon,
              section: item.section,
              star_value: item.star_value,
              start_time: item.start_time,
              end_time: item.end_time,
              sort_order: item.sort_order,
              sub_steps: item.sub_steps,
              is_optional: item.is_optional,
              variant_key: item.variant_key,
              schedule_canonical_id: item.schedule_canonical_id,
              activity_canonical_id: item.activity_canonical_id,
            })),
          };
        }
        if (text.startsWith('INSERT INTO default_activity_template')) {
          syncStore.writes.push({ sql: text, params });
          const row = {
            id: randomUUID(),
            canonical_id: params[0],
            name: params[1],
            name_i18n: JSON.parse(params[2]),
            icon_key: params[3],
            icon: params[4],
            star_value: params[5],
            duration_seconds: params[6],
            sub_steps: JSON.parse(params[7]),
            variants: JSON.parse(params[8]),
            seven_questions: JSON.parse(params[9]),
            deprecated: params[10],
            sort_order: params[11],
          };
          syncStore.activities.push(row);
          return { rows: [{ id: row.id, canonical_id: row.canonical_id }], rowCount: 1 };
        }
        if (text.startsWith('UPDATE default_activity_template')) {
          syncStore.writes.push({ sql: text, params });
          const row = syncStore.activities.find((a) => a.id === params[0]);
          Object.assign(row, {
            name: params[1],
            name_i18n: JSON.parse(params[2]),
            icon_key: params[3],
            icon: params[4],
            star_value: params[5],
            duration_seconds: params[6],
            sub_steps: JSON.parse(params[7]),
            variants: JSON.parse(params[8]),
            seven_questions: JSON.parse(params[9]),
            deprecated: params[10],
            sort_order: params[11],
          });
          return { rows: [], rowCount: 1 };
        }
        if (text.startsWith('INSERT INTO default_schedule_item')) {
          syncStore.writes.push({ sql: text, params });
          const schedule = syncStore.schedules.find((s) => s.id === params[0]);
          const activity = syncStore.activities.find((a) => a.id === params[1]);
          syncStore.scheduleItems.push({
            id: randomUUID(),
            default_schedule_id: params[0],
            default_activity_template_id: params[1],
            name: params[2],
            icon: params[3],
            section: params[4],
            star_value: params[5],
            start_time: params[6],
            end_time: params[7],
            sort_order: params[8],
            sub_steps: JSON.parse(params[9]),
            is_optional: params[10],
            variant_key: params[11],
            schedule_canonical_id: schedule?.canonical_id ?? null,
            activity_canonical_id: activity?.canonical_id ?? null,
          });
          return { rows: [], rowCount: 1 };
        }
        if (text.startsWith('INSERT INTO default_schedule')) {
          syncStore.writes.push({ sql: text, params });
          const row = {
            id: randomUUID(),
            canonical_id: params[0],
            name: params[1],
            name_i18n: JSON.parse(params[2]),
            description: params[3],
            description_i18n: JSON.parse(params[4]),
            deprecated: params[5],
            sort_order: params[6],
          };
          syncStore.schedules.push(row);
          return { rows: [{ id: row.id, canonical_id: row.canonical_id }], rowCount: 1 };
        }
        if (text.startsWith('UPDATE default_schedule_item')) {
          syncStore.writes.push({ sql: text, params });
          const row = syncStore.scheduleItems.find((item) => item.id === params[0]);
          const schedule = syncStore.schedules.find((s) => s.id === params[1]);
          const activity = syncStore.activities.find((a) => a.id === params[2]);
          Object.assign(row, {
            default_schedule_id: params[1],
            default_activity_template_id: params[2],
            name: params[3],
            icon: params[4],
            section: params[5],
            star_value: params[6],
            start_time: params[7],
            end_time: params[8],
            sort_order: params[9],
            sub_steps: JSON.parse(params[10]),
            is_optional: params[11],
            variant_key: params[12],
            schedule_canonical_id: schedule?.canonical_id ?? null,
            activity_canonical_id: activity?.canonical_id ?? null,
          });
          return { rows: [], rowCount: 1 };
        }
        if (text.startsWith('UPDATE default_schedule ')) {
          syncStore.writes.push({ sql: text, params });
          const row = syncStore.schedules.find((s) => s.id === params[0]);
          Object.assign(row, {
            name: params[1],
            name_i18n: JSON.parse(params[2]),
            description: params[3],
            description_i18n: JSON.parse(params[4]),
            deprecated: params[5],
            sort_order: params[6],
          });
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`unexpected sync query: ${text}`);
      },
    };

    const firstSync = await syncStandardLibrary(syncClient, { manifest });
    assert.equal(firstSync.ok, true);
    assert.equal(firstSync.summary.schedule_items.inserts, 98);

    const preschoolItem = firstSync.summary;
    const desiredAfterSync = buildDesiredStateFromManifest(manifest);
    const preschool = desiredAfterSync.scheduleItems.find(
      (i) => i.schedule_canonical_id === 'preschool_weekday'
        && i.activity_canonical_id === 'preschool'
    );
    const school = desiredAfterSync.scheduleItems.find(
      (i) => i.schedule_canonical_id === 'school_weekday'
        && i.activity_canonical_id === 'school'
    );
    const afterSchool = desiredAfterSync.scheduleItems.find(
      (i) => i.schedule_canonical_id === 'school_weekday'
        && i.activity_canonical_id === 'after_school'
    );
    assert.deepEqual({ start_time: preschool.start_time, end_time: preschool.end_time }, {
      start_time: '08:00',
      end_time: '15:00',
    });
    assert.deepEqual({ start_time: school.start_time, end_time: school.end_time }, {
      start_time: '08:00',
      end_time: '15:00',
    });
    assert.equal(afterSchool.start_time, null);
    assert.equal(afterSchool.end_time, null);

    const canonicalActivities = new Set(
      syncStore.activities.filter((a) => a.canonical_id).map((a) => a.canonical_id)
    );
    assert.equal(canonicalActivities.size, 31);
    assert.equal(syncStore.schedules.filter((s) => s.canonical_id).length, 8);
    assert.equal(syncStore.scheduleItems.length, 98);

    const writesAfterFirst = syncStore.writes.length;
    const secondSync = await syncStandardLibrary(syncClient, { manifest });
    assert.equal(secondSync.ok, true);
    assert.equal(secondSync.summary.totals.inserts, 0);
    assert.equal(secondSync.summary.totals.updates, 0);
    assert.equal(syncStore.writes.length, writesAfterFirst);
  });
});

describe('standard library sync conflict hardening', () => {
  it('E: sync fails closed on duplicate canonical_id rows', async () => {
    const manifest = cloneManifest();
    const client = {
      async query(sql) {
        const text = String(sql).replace(/\s+/g, ' ').trim();
        if (text.includes('FROM default_activity_template') && text.includes('canonical_id IS NOT NULL')) {
          return {
            rows: [
              { id: '1', canonical_id: 'wake_up', name: 'A' },
              { id: '2', canonical_id: 'wake_up', name: 'B' },
            ],
          };
        }
        if (text.includes('FROM default_schedule') && text.includes('canonical_id IS NOT NULL')) {
          return { rows: [] };
        }
        if (text.includes('FROM default_schedule_item dsi')) return { rows: [] };
        throw new Error(`unexpected: ${text}`);
      },
    };
    const result = await syncStandardLibrary(client, { manifest, dryRun: true });
    assert.equal(result.ok, false);
    assert.ok(result.conflictErrors.length > 0);
  });
});

describe('standard library backfill DB integration', () => {
  test('N/O: family activity_template and rewards untouched during backfill dry-run', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      await db.truncate();
      const familyRes = await db.query(`INSERT INTO family (name) VALUES ('PR2B family') RETURNING id`);
      const familyId = familyRes.rows[0].id;
      await db.query(
        `INSERT INTO default_reward (name, icon, star_cost, sort_order) VALUES ('Glass', '🍦', 10, 1)`
      );
      await db.query(
        `INSERT INTO default_activity_template (name, icon, star_value, sort_order, sub_steps)
         VALUES ('Vakna', '🛏️', 1, 1, '[]'::jsonb)`
      );
      await db.query(
        `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order)
         VALUES ($1, 'Family owned', '⭐', 1, 1)`,
        [familyId]
      );

      const beforeFamily = await db.query(`SELECT name FROM activity_template WHERE family_id = $1`, [familyId]);
      const beforeRewards = await db.query(`SELECT COUNT(*)::int AS count FROM default_reward`);

      const client = { query: (text, params) => db.query(text, params) };
      const result = await backfillStandardLibrary(client, { dryRun: true });
      assert.equal(result.ok, true);

      const afterFamily = await db.query(`SELECT name FROM activity_template WHERE family_id = $1`, [familyId]);
      const afterRewards = await db.query(`SELECT COUNT(*)::int AS count FROM default_reward`);
      assert.deepEqual(afterFamily.rows, beforeFamily.rows);
      assert.equal(afterRewards.rows[0].count, beforeRewards.rows[0].count);
    } finally {
      await db.cleanup();
    }
  });
});

describe('non-local apply safety (stable legacy IDs)', () => {
  const map = loadLegacyMap();
  const nonLocalUrl = 'postgresql://user:secret@db.example.com:5432/backfill_target';
  const localUrl = 'postgresql://user:secret@localhost:5432/stjarndag';

  function createMinimalState(activityId = randomUUID()) {
    return {
      activities: [{
        id: activityId,
        name: 'Vakna',
        package_component: null,
        sort_order: 1,
        canonical_id: null,
      }],
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
  }

  function createStableIdMap(activityId) {
    return {
      format: 'my' + 'starday-standard-library-legacy-map',
      schema_version: 1,
      content_version: '1.1',
      activities: [{
        match: { legacy_id: activityId, legacy_name: 'Vakna' },
        canonical_id: 'wake_up',
        classification: 'SAFE_EXPLICIT_MAPPING',
      }],
      schedules: [],
    };
  }

  it('1: local apply with explicit name mapping is allowed for fixture simulation', async () => {
    const state = createMinimalState();
    const client = createBackfillMockClient(state);
    const result = await backfillStandardLibrary(client, {
      dryRun: false,
      map,
      databaseUrl: localUrl,
    });
    assert.equal(result.ok, true);
    assert.equal(state.activities[0].canonical_id, 'wake_up');
    assert.ok(state.writes?.length > 0);
  });

  it('2: non-local dry-run with name-only mapping is allowed preview with zero writes', async () => {
    const state = createMinimalState();
    const client = createBackfillMockClient(state);
    const result = await backfillStandardLibrary(client, {
      dryRun: true,
      map,
      databaseUrl: nonLocalUrl,
    });
    assert.equal(result.ok, true);
    assert.equal(result.plan.apply_safety.preview_only_writes, 1);
    assert.equal(state.writes?.length || 0, 0);
    const mapping = result.plan.mappings.activities.find((m) => m.legacy_name === 'Vakna');
    assert.equal(mapping.apply_authorization, APPLY_AUTHORIZATION_PREVIEW_ONLY);
  });

  it('3: non-local apply with name-only mapping fails closed', async () => {
    const state = createMinimalState();
    const client = createBackfillMockClient(state);
    const result = await backfillStandardLibrary(client, {
      dryRun: false,
      map,
      databaseUrl: nonLocalUrl,
    });
    assert.equal(result.ok, false);
    assert.deepEqual(result.blockingErrors, [BACKFILL_REQUIRES_STABLE_LEGACY_IDS_ERROR]);
    assert.equal(state.activities[0].canonical_id, null);
    assert.equal(state.writes?.length || 0, 0);
  });

  it('4: non-local apply with stable explicit legacy IDs is permitted', async () => {
    const activityId = randomUUID();
    const state = createMinimalState(activityId);
    const client = createBackfillMockClient(state);
    const result = await backfillStandardLibrary(client, {
      dryRun: false,
      map: createStableIdMap(activityId),
      databaseUrl: nonLocalUrl,
    });
    assert.equal(result.ok, true);
    assert.equal(state.activities[0].canonical_id, 'wake_up');
    assert.equal(result.plan.apply_safety.preview_only_writes, 0);
  });

  it('5: mixed stable-ID and name-only mapping in non-local apply fails entire run', async () => {
    const wakeId = randomUUID();
    const snackId = randomUUID();
    const mixedMap = {
      format: 'my' + 'starday-standard-library-legacy-map',
      schema_version: 1,
      content_version: '1.1',
      activities: [
        {
          match: { legacy_id: wakeId, legacy_name: 'Vakna' },
          canonical_id: 'wake_up',
          classification: 'SAFE_EXPLICIT_MAPPING',
        },
        {
          match: { legacy_name: 'Mellanmål', package_component: null },
          canonical_id: 'snack',
          classification: 'SAFE_EXPLICIT_MAPPING',
        },
      ],
      schedules: [],
    };
    const state = {
      activities: [
        { id: wakeId, name: 'Vakna', package_component: null, sort_order: 1, canonical_id: null },
        { id: snackId, name: 'Mellanmål', package_component: null, sort_order: 2, canonical_id: null },
      ],
      schedules: [],
      scheduleItems: [],
      rewards: [],
    };
    const client = createBackfillMockClient(state);
    const result = await backfillStandardLibrary(client, {
      dryRun: false,
      map: mixedMap,
      databaseUrl: nonLocalUrl,
    });
    assert.equal(result.ok, false);
    assert.deepEqual(result.blockingErrors, [BACKFILL_REQUIRES_STABLE_LEGACY_IDS_ERROR]);
    assert.equal(state.activities[0].canonical_id, null);
    assert.equal(state.activities[1].canonical_id, null);
  });

  it('6: non-local apply failure happens before mutation / transaction remains zero-write', async () => {
    const state = createMinimalState();
    let beginCalled = false;
    const client = {
      async query(sql, params = []) {
        const text = String(sql).replace(/\s+/g, ' ').trim();
        if (text === 'BEGIN') {
          beginCalled = true;
          return { rows: [] };
        }
        if (text.includes('FROM default_activity_template') && !text.includes('default_schedule_item')) {
          return { rows: state.activities };
        }
        if (text.includes('FROM default_schedule') && !text.includes('default_schedule_item')) {
          return { rows: state.schedules };
        }
        if (text.includes('FROM default_schedule_item dsi')) return { rows: state.scheduleItems };
        if (text.includes('FROM default_reward')) return { rows: state.rewards };
        throw new Error(`unexpected query: ${text}`);
      },
    };
    const result = await backfillStandardLibrary(client, {
      dryRun: false,
      map,
      databaseUrl: nonLocalUrl,
    });
    assert.equal(result.ok, false);
    assert.equal(beginCalled, false);
    assert.equal(state.writes?.length || 0, 0);
  });
});

describe('standard library backfill CLI contract', () => {
  const { execFileSync } = require('child_process');
  const path = require('path');
  const ROOT = path.join(__dirname, '..');

  function run(script, args = [], env = {}) {
    try {
      return {
        status: execFileSync(process.execPath, [script, ...args], {
          cwd: ROOT,
          env: { ...process.env, ...env },
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
        stderr: '',
        exitCode: 0,
      };
    } catch (err) {
      return {
        status: err.stdout || '',
        stderr: err.stderr || '',
        exitCode: err.status ?? 1,
      };
    }
  }

  it('--help documents dry-run default, apply confirmation, and stable IDs', () => {
    const out = run('scripts/backfill-standard-library.js', ['--help']);
    assert.equal(out.exitCode, 0);
    assert.match(out.status, /--dry-run/i);
    assert.match(out.status, /STANDARD_LIBRARY_BACKFILL_CONFIRM/i);
    assert.match(out.status, /stable legacy row UUID/i);
  });

  it('exits 2 without DATABASE_URL', () => {
    const out = run('scripts/backfill-standard-library.js', ['--dry-run'], { DATABASE_URL: '' });
    assert.equal(out.exitCode, 2);
    assert.match(out.stderr, /DATABASE_URL is required/i);
  });
});
