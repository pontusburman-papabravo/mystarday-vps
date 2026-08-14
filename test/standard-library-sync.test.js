'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const {
  buildDesiredStateFromManifest,
  computeSyncPlan,
  syncStandardLibrary,
} = require('../src/lib/standard-library-sync');
const { readManifestFile, DEFAULT_MANIFEST_PATH } = require('../src/lib/standard-library-manifest');

function cloneManifest() {
  return structuredClone(readManifestFile(DEFAULT_MANIFEST_PATH));
}

function createMockSyncStore() {
  return {
    activities: [],
    schedules: [],
    scheduleItems: [],
    writes: [],
    inTransaction: false,
    failOnWrite: null,
  };
}

function snapshotStore(store) {
  return {
    activities: structuredClone(store.activities),
    schedules: structuredClone(store.schedules),
    scheduleItems: structuredClone(store.scheduleItems),
    writes: structuredClone(store.writes),
  };
}

function restoreStore(store, snapshot) {
  store.activities = snapshot.activities;
  store.schedules = snapshot.schedules;
  store.scheduleItems = snapshot.scheduleItems;
  store.writes = snapshot.writes;
}

function createMockSyncClient(store) {
  let txSnapshot = null;

  return {
    async query(sql, params = []) {
      const text = String(sql).replace(/\s+/g, ' ').trim();

      if (text === 'BEGIN') {
        store.inTransaction = true;
        txSnapshot = snapshotStore(store);
        return { rows: [] };
      }
      if (text === 'COMMIT') {
        store.inTransaction = false;
        txSnapshot = null;
        return { rows: [] };
      }
      if (text === 'ROLLBACK') {
        if (txSnapshot) restoreStore(store, txSnapshot);
        store.inTransaction = false;
        txSnapshot = null;
        return { rows: [] };
      }

      if (text.includes('FROM default_activity_template') && text.includes('canonical_id IS NOT NULL')) {
        return { rows: store.activities.filter((row) => row.canonical_id) };
      }

      if (text.includes('FROM default_schedule') && text.includes('canonical_id IS NOT NULL') && !text.includes('default_schedule_item')) {
        return { rows: store.schedules.filter((row) => row.canonical_id) };
      }

      if (text.includes('FROM default_schedule_item dsi')) {
        return {
          rows: store.scheduleItems.map((item) => {
            const schedule = store.schedules.find((s) => s.id === item.default_schedule_id);
            const activity = store.activities.find((a) => a.id === item.default_activity_template_id);
            return {
              ...item,
              schedule_canonical_id: schedule?.canonical_id ?? null,
              activity_canonical_id: activity?.canonical_id ?? null,
            };
          }).filter((item) => item.schedule_canonical_id),
        };
      }

      if (text.startsWith('INSERT INTO default_activity_template')) {
        if (store.failOnWrite?.test(text)) throw new Error('injected DB failure');
        store.writes.push({ sql: text, params });
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
        store.activities.push(row);
        return { rows: [{ id: row.id, canonical_id: row.canonical_id }], rowCount: 1 };
      }

      if (text.startsWith('UPDATE default_activity_template')) {
        if (store.failOnWrite?.test(text)) throw new Error('injected DB failure');
        store.writes.push({ sql: text, params });
        const row = store.activities.find((a) => a.id === params[0]);
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
        if (store.failOnWrite?.test(text)) throw new Error('injected DB failure');
        store.writes.push({ sql: text, params });
        store.scheduleItems.push({
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
        });
        return { rows: [], rowCount: 1 };
      }

      if (text.startsWith('INSERT INTO default_schedule')) {
        if (store.failOnWrite?.test(text)) throw new Error('injected DB failure');
        store.writes.push({ sql: text, params });
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
        store.schedules.push(row);
        return { rows: [{ id: row.id, canonical_id: row.canonical_id }], rowCount: 1 };
      }

      if (text.startsWith('UPDATE default_schedule_item')) {
        if (store.failOnWrite?.test(text)) throw new Error('injected DB failure');
        store.writes.push({ sql: text, params });
        const row = store.scheduleItems.find((item) => item.id === params[0]);
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
        });
        return { rows: [], rowCount: 1 };
      }

      if (text.startsWith('UPDATE default_schedule ')) {
        if (store.failOnWrite?.test(text)) throw new Error('injected DB failure');
        store.writes.push({ sql: text, params });
        const row = store.schedules.find((s) => s.id === params[0]);
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

      throw new Error(`unexpected query: ${text}`);
    },
  };
}

function countWriteQueries(store) {
  return store.writes.length;
}

describe('standard library sync foundation', () => {
  it('never identifies canonical rows via display name lookups', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../src/lib/standard-library-sync.js'),
      'utf8'
    );
    assert.doesNotMatch(source, /LOWER\s*\(\s*name\s*\)/i);
  });

  it('invalid manifest performs no DB writes', async () => {
    const store = createMockSyncStore();
    const client = createMockSyncClient(store);
    const manifest = cloneManifest();
    delete manifest.activities[0].name_i18n.sv;

    const result = await syncStandardLibrary(client, { manifest });
    assert.equal(result.ok, false);
    assert.equal(countWriteQueries(store), 0);
  });

  it('dry-run performs no writes', async () => {
    const store = createMockSyncStore();
    const client = createMockSyncClient(store);
    const manifest = cloneManifest();

    const result = await syncStandardLibrary(client, { manifest, dryRun: true });
    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);
    assert.equal(countWriteQueries(store), 0);
    assert.ok(result.summary.totals.inserts > 0);
  });

  it('first sync inserts canonical rows', async () => {
    const store = createMockSyncStore();
    const client = createMockSyncClient(store);
    const manifest = cloneManifest();

    const result = await syncStandardLibrary(client, { manifest });
    assert.equal(result.ok, true);
    assert.equal(result.summary.activities.inserts, 2);
    assert.equal(result.summary.schedules.inserts, 1);
    assert.equal(result.summary.schedule_items.inserts, 2);
    assert.equal(store.activities.length, 2);
    assert.equal(store.schedules.length, 1);
    assert.equal(store.scheduleItems.length, 2);
  });

  it('second identical sync is unchanged/no-op', async () => {
    const store = createMockSyncStore();
    const client = createMockSyncClient(store);
    const manifest = cloneManifest();

    await syncStandardLibrary(client, { manifest });
    const writesAfterFirst = countWriteQueries(store);

    const second = await syncStandardLibrary(client, { manifest });
    assert.equal(second.summary.totals.inserts, 0);
    assert.equal(second.summary.totals.updates, 0);
    assert.equal(second.summary.totals.unchanged, 5);
    assert.equal(countWriteQueries(store), writesAfterFirst);
  });

  it('changed canonical data updates via canonical_id', async () => {
    const store = createMockSyncStore();
    const client = createMockSyncClient(store);
    const manifest = cloneManifest();

    await syncStandardLibrary(client, { manifest });
    manifest.activities[0].name_i18n.sv = 'Borsta tänderna uppdaterad';
    manifest.activities[0].name_i18n['en-GB'] = 'Brush teeth updated';

    const second = await syncStandardLibrary(client, { manifest });
    assert.equal(second.summary.activities.updates, 1);
    assert.equal(second.summary.activities.inserts, 0);
    assert.equal(store.activities.length, 2);
    assert.equal(store.activities.find((a) => a.canonical_id === 'brush_teeth').name, 'Borsta tänderna uppdaterad');
  });

  it('name change does not create a new canonical activity', async () => {
    const store = createMockSyncStore();
    const client = createMockSyncClient(store);
    const manifest = cloneManifest();

    await syncStandardLibrary(client, { manifest });
    const firstId = store.activities.find((a) => a.canonical_id === 'brush_teeth').id;
    manifest.activities[0].name_i18n.sv = 'Helt nytt namn';

    await syncStandardLibrary(client, { manifest });
    const secondId = store.activities.find((a) => a.canonical_id === 'brush_teeth').id;
    assert.equal(firstId, secondId);
    assert.equal(store.activities.filter((a) => a.canonical_id === 'brush_teeth').length, 1);
  });

  it('rolls back on injected DB failure', async () => {
    const store = createMockSyncStore();
    const client = createMockSyncClient(store);
    store.failOnWrite = /INSERT INTO default_schedule_item/;
    const manifest = cloneManifest();

    await assert.rejects(
      () => syncStandardLibrary(client, { manifest }),
      /injected DB failure/
    );
    assert.equal(store.activities.length, 0);
    assert.equal(store.schedules.length, 0);
    assert.equal(store.scheduleItems.length, 0);
    assert.equal(store.inTransaction, false);
  });

  it('stores variant data in variants JSONB, not top-level sub_steps', async () => {
    const store = createMockSyncStore();
    const client = createMockSyncClient(store);
    const manifest = cloneManifest();

    await syncStandardLibrary(client, { manifest });
    const afterSchool = store.activities.find((a) => a.canonical_id === 'after_school');
    assert.deepEqual(afterSchool.sub_steps, []);
    assert.equal(afterSchool.variants.length, 2);
    assert.equal(afterSchool.variants[0].variant_key, 'after_school_club');
    assert.ok(afterSchool.variants[0].sub_steps.length > 0);
  });

  it('resolves default_schedule_item FK to canonical default_activity_template', async () => {
    const store = createMockSyncStore();
    const client = createMockSyncClient(store);
    const manifest = cloneManifest();

    await syncStandardLibrary(client, { manifest });
    const brush = store.activities.find((a) => a.canonical_id === 'brush_teeth');
    const morning = store.schedules.find((s) => s.canonical_id === 'morning_routine');
    const firstItem = store.scheduleItems.find((item) => item.sort_order === 0);

    assert.equal(firstItem.default_schedule_id, morning.id);
    assert.equal(firstItem.default_activity_template_id, brush.id);
    assert.equal(firstItem.section, 'morgon');
  });
});
