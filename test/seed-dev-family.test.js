'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/lib/db');
const { ensureDevFamilyReady } = require('../src/lib/seed-dev-family');

let familyId;
let childId;

before(async () => {
  const family = await db.query(
    `INSERT INTO family (name, subscription_status, is_lifetime_free)
     VALUES ('Seed-test', 'none', true) RETURNING id`
  );
  familyId = family.rows[0].id;

  const child = await db.query(
    `INSERT INTO child (family_id, name, emoji, timezone, view_mode)
     VALUES ($1, 'Seedbarn', '🌟', 'Europe/Stockholm', 'auto') RETURNING id`,
    [familyId]
  );
  childId = child.rows[0].id;
});

after(async () => {
  if (childId) await db.query('DELETE FROM child WHERE id = $1', [childId]);
  if (familyId) await db.query('DELETE FROM family WHERE id = $1', [familyId]);
});

test('ensureDevFamilyReady seeds activities, rewards, and weekly schedule', async () => {
  await ensureDevFamilyReady(familyId, childId);

  const acts = await db.query(
    'SELECT COUNT(*)::int AS n FROM activity_template WHERE family_id = $1',
    [familyId]
  );
  const rwds = await db.query(
    'SELECT COUNT(*)::int AS n FROM reward WHERE family_id = $1',
    [familyId]
  );
  const sched = await db.query(
    'SELECT COUNT(*)::int AS n FROM weekly_schedule WHERE child_id = $1',
    [childId]
  );

  assert.ok(acts.rows[0].n >= 6);
  assert.ok(rwds.rows[0].n >= 2);
  assert.equal(sched.rows[0].n, 5);
});

test('ensureDevFamilyReady is idempotent', async () => {
  await ensureDevFamilyReady(familyId, childId);
  await ensureDevFamilyReady(familyId, childId);

  const acts = await db.query(
    'SELECT COUNT(*)::int AS n FROM activity_template WHERE family_id = $1',
    [familyId]
  );
  assert.equal(acts.rows[0].n, 6);
});
