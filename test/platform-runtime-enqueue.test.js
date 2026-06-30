'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { injectMockDb } = require('./helpers/setup.js');

const ROOT = path.join(__dirname, '..');

describe('Platform Runtime — progression event enqueue', () => {
  it('uses INSERT ON CONFLICT for atomic idempotency', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'db/child-progression-node.js'),
      'utf8'
    );
    assert.match(src, /ON CONFLICT \(idempotency_key\) DO NOTHING/);
    assert.match(src, /23505/);
  });

  it('returns replayed when processed_at is set', async () => {
    const mock = injectMockDb();
    mock.setQuery(async (sql) => {
      const q = String(sql);
      if (q.includes('INSERT INTO progression_event_queue')) {
        return { rows: [] };
      }
      if (q.includes('FROM progression_event_queue') && q.includes('idempotency_key')) {
        return { rows: [{ id: 'evt-1', processed_at: new Date().toISOString() }] };
      }
      return { rows: [] };
    });

    const modPath = require.resolve('../db/child-progression-node');
    delete require.cache[modPath];
    const { enqueueEvent } = require(modPath);

    const result = await enqueueEvent({
      childId: 'child-1',
      familyId: 'fam-1',
      eventType: 'onActivityComplete',
      idempotencyKey: 'activity_complete:child-1:item-1',
      payload: { dailyLogItemId: 'item-1' },
    });

    assert.equal(result.inserted, false);
    assert.equal(result.replayed, true);
    assert.equal(result.pending, false);
  });

  it('returns pending when row exists but is not processed (recovery path)', async () => {
    const mock = injectMockDb();
    mock.setQuery(async (sql) => {
      const q = String(sql);
      if (q.includes('INSERT INTO progression_event_queue')) {
        return { rows: [] };
      }
      if (q.includes('FROM progression_event_queue') && q.includes('idempotency_key')) {
        return { rows: [{ id: 'evt-2', processed_at: null }] };
      }
      return { rows: [] };
    });

    const modPath = require.resolve('../db/child-progression-node');
    delete require.cache[modPath];
    const { enqueueEvent } = require(modPath);

    const result = await enqueueEvent({
      childId: 'child-1',
      familyId: 'fam-1',
      eventType: 'onActivityComplete',
      idempotencyKey: 'activity_complete:child-1:item-2',
      payload: { dailyLogItemId: 'item-2' },
    });

    assert.equal(result.inserted, false);
    assert.equal(result.replayed, false);
    assert.equal(result.pending, true);
  });
});
