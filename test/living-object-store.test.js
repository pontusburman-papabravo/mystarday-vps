'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');

const livingObjectDb = require('../db/living-object');

describe('living_object_instance — ObjectStore', () => {
  it('migration exposes down() for rollback gate', () => {
    const mod = require('../migrations/1809140000000_living_object_instance');
    assert.equal(typeof mod.down, 'function');
    const src = fs.readFileSync(
      path.join(__dirname, '../migrations/1809140000000_living_object_instance.js'),
      'utf8'
    );
    assert.match(src, /DROP TABLE IF EXISTS living_object_instance/);
  });

  it('db module supports optimistic version updates', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../db/living-object.js'),
      'utf8'
    );
    assert.match(src, /WHERE id = \$3 AND version = \$4/);
    assert.match(src, /version = version \+ 1/);
    assert.match(src, /conflict: true/);
  });

  it('CRUD + version conflict (DB)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Garden Store', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;

      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'Maja', '🌻', 'maja', 'hash', 0) RETURNING id`,
        [familyId]
      );
      const childId = child.rows[0].id;

      const created = await livingObjectDb.createInstance({
        childId,
        familyId,
        worldSlug: 'garden',
        archetypeId: 'sunflower',
        slotId: 'bed_1',
        stateKey: 'empty',
        stateData: { label: 'Solrosen' },
      }, db.query);

      assert.ok(created.id);
      assert.equal(created.version, 1);
      assert.equal(created.state_key, 'empty');
      assert.deepEqual(created.state_data, { label: 'Solrosen' });

      const bySlot = await livingObjectDb.getBySlot(childId, 'garden', 'bed_1', db.query);
      assert.equal(bySlot.id, created.id);

      const listed = await livingObjectDb.listByChild(childId, 'garden', db.query);
      assert.equal(listed.length, 1);

      const okUpdate = await livingObjectDb.updateState({
        instanceId: created.id,
        expectedVersion: 1,
        stateKey: 'planted',
        stateData: { planted_at: '2026-06-30T07:00:00Z' },
      }, db.query);
      assert.equal(okUpdate.updated, true);
      assert.equal(okUpdate.conflict, false);
      assert.equal(okUpdate.row.version, 2);
      assert.equal(okUpdate.row.state_key, 'planted');

      const staleUpdate = await livingObjectDb.updateState({
        instanceId: created.id,
        expectedVersion: 1,
        stateKey: 'blooming',
        stateData: {},
      }, db.query);
      assert.equal(staleUpdate.updated, false);
      assert.equal(staleUpdate.conflict, true);

      const current = await livingObjectDb.getById(created.id, db.query);
      assert.equal(current.state_key, 'planted');
      assert.equal(current.version, 2);

      const deleted = await livingObjectDb.deleteInstance(created.id, db.query);
      assert.equal(deleted, true);
      assert.equal(await livingObjectDb.getById(created.id, db.query), null);
    } finally {
      await db.cleanup();
    }
  });

  it('unique slot constraint prevents duplicate placement (DB)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Garden Dup', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;
      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'Erik', '🌻', 'erik', 'hash', 0) RETURNING id`,
        [familyId]
      );
      const childId = child.rows[0].id;

      await livingObjectDb.createInstance({
        childId,
        familyId,
        worldSlug: 'garden',
        archetypeId: 'sunflower',
        slotId: 'bed_1',
        stateKey: 'empty',
      }, db.query);

      await assert.rejects(
        () => livingObjectDb.createInstance({
          childId,
          familyId,
          worldSlug: 'garden',
          archetypeId: 'sunflower',
          slotId: 'bed_1',
          stateKey: 'empty',
        }, db.query),
        /unique|duplicate/i
      );
    } finally {
      await db.cleanup();
    }
  });
});
