'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

let db;
let http;
let session;
let familyId;
let childA;
let childB;
let keepId;

function headers() {
  return {
    'Content-Type': 'application/json',
    Cookie: cookieHeader(session.cookies),
    'X-CSRF-Token': session.csrfToken,
  };
}

async function createActivity(name) {
  const res = await fetch(`${http.baseUrl}/api/activities`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name, icon: '⭐', star_value: 1 }),
  });
  const body = await res.json();
  assert.equal(res.status, 201, JSON.stringify(body));
  return body.id;
}

async function addSchedule(childId, day, activityId) {
  const schedule = await db.query(
    `INSERT INTO weekly_schedule (child_id, family_id, day_of_week, name)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [childId, familyId, day, 'day-' + day]
  );
  await db.query(
    `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
     VALUES ($1, $2, 0, 'morgon')`,
    [schedule.rows[0].id, activityId]
  );
  return schedule.rows[0].id;
}

async function counts(activityId) {
  const items = await db.query(
    'SELECT COUNT(*)::int AS n FROM weekly_schedule_item WHERE activity_template_id = $1',
    [activityId]
  );
  const activity = await db.query(
    'SELECT COUNT(*)::int AS n FROM activity_template WHERE id = $1',
    [activityId]
  );
  return { items: items.rows[0].n, activity: activity.rows[0].n };
}

describe('activity force delete', () => {
  before(async () => {
    db = await setupTestDb();
    if (db.skip) return;
    const { createApp } = require('../app');
    http = await listenApp(createApp);
    session = await registerAndLogin(http.baseUrl);
    childA = await createChild(http.baseUrl, session, { name: 'Astrid' });
    childB = await createChild(http.baseUrl, session, { name: 'Bo' });
    const family = await db.query('SELECT family_id FROM child WHERE id = $1', [childA]);
    familyId = family.rows[0].family_id;
    keepId = await createActivity('Stanna');
  });

  after(async () => {
    if (http) await http.close();
    if (db && db.cleanup) await db.cleanup();
    if (db && db.query) {
      await db.query('DROP TABLE IF EXISTS activity_force_delete_guard').catch(() => {});
    }
  });

  it('deletes an activity that is not on a weekly schedule', async (t) => {
    if (!db || db.skip) return t.skip('No real DATABASE_URL');
    const id = await createActivity('Ensam');
    const res = await fetch(`${http.baseUrl}/api/activities/${id}`, {
      method: 'DELETE',
      headers: headers(),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.activity_deleted, true);
    assert.equal(body.number_of_schedule_references_removed, 0);
    const left = await counts(id);
    assert.equal(left.activity, 0);
    assert.equal(left.items, 0);
  });

  it('requires confirmation when the activity is on weekly schedules', async (t) => {
    if (!db || db.skip) return t.skip('No real DATABASE_URL');
    const id = await createActivity('Bio');
    await addSchedule(childA, 1, id);
    await addSchedule(childA, 2, id);
    await addSchedule(childB, 3, id);
    const res = await fetch(`${http.baseUrl}/api/activities/${id}`, {
      method: 'DELETE',
      headers: headers(),
    });
    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.code, 'ACTIVITY_IN_USE');
    assert.equal(body.schedule_count, 3);
    assert.equal(body.schedule_reference_count, 3);
    const left = await counts(id);
    assert.equal(left.activity, 1);
    assert.equal(left.items, 3);
    t.after(async () => {
      await db.query('DELETE FROM weekly_schedule_item WHERE activity_template_id = $1', [id]);
      await db.query('DELETE FROM activity_template WHERE id = $1', [id]);
    });
  });

  it('cancel leaves schedule rows and the activity in place', async (t) => {
    if (!db || db.skip) return t.skip('No real DATABASE_URL');
    const id = await createActivity('Bok');
    await addSchedule(childA, 4, id);
    const blocked = await fetch(`${http.baseUrl}/api/activities/${id}`, {
      method: 'DELETE',
      headers: headers(),
    });
    assert.equal(blocked.status, 409);
    const left = await counts(id);
    assert.equal(left.activity, 1);
    assert.equal(left.items, 1);
    await db.query('DELETE FROM weekly_schedule_item WHERE activity_template_id = $1', [id]);
    await db.query('DELETE FROM activity_template WHERE id = $1', [id]);
  });

  it('force delete removes every weekly reference and then the activity', async (t) => {
    if (!db || db.skip) return t.skip('No real DATABASE_URL');
    const id = await createActivity('Glass');
    const scheduleId = await addSchedule(childA, 5, id);
    await db.query(
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
       VALUES ($1, $2, 1, 'kvall')`,
      [scheduleId, keepId]
    );
    const res = await fetch(`${http.baseUrl}/api/activities/${id}?force=1`, {
      method: 'DELETE',
      headers: headers(),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.activity_deleted, true);
    assert.equal(body.number_of_schedule_references_removed, 1);
    const left = await counts(id);
    assert.equal(left.activity, 0);
    assert.equal(left.items, 0);
    const kept = await db.query(
      'SELECT COUNT(*)::int AS n FROM weekly_schedule_item WHERE activity_template_id = $1',
      [keepId]
    );
    assert.equal(kept.rows[0].n, 1);
  });

  it('force delete clears references for several children and days', async (t) => {
    if (!db || db.skip) return t.skip('No real DATABASE_URL');
    const id = await createActivity('Saga');
    await addSchedule(childA, 6, id);
    await addSchedule(childB, 6, id);
    await addSchedule(childB, 7, id);
    const res = await fetch(`${http.baseUrl}/api/activities/${id}?force=1`, {
      method: 'DELETE',
      headers: headers(),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.schedule_count, 3);
    assert.equal(body.number_of_schedule_references_removed, 3);
    assert.equal(body.activity_deleted, true);
    const left = await counts(id);
    assert.equal(left.activity, 0);
    assert.equal(left.items, 0);
    const other = await counts(keepId);
    assert.equal(other.activity, 1);
  });

  it('rolls back schedule removal when the activity delete fails', async (t) => {
    if (!db || db.skip) return t.skip('No real DATABASE_URL');
    const id = await createActivity('Låst');
    await addSchedule(childA, 0, id);
    await db.query(`
      CREATE TABLE IF NOT EXISTS activity_force_delete_guard (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_template_id UUID NOT NULL REFERENCES activity_template(id) ON DELETE RESTRICT
      )
    `);
    await db.query(
      'INSERT INTO activity_force_delete_guard (activity_template_id) VALUES ($1)',
      [id]
    );
    try {
      const res = await fetch(`${http.baseUrl}/api/activities/${id}?force=1`, {
        method: 'DELETE',
        headers: headers(),
      });
      const body = await res.json();
      assert.equal(res.status, 500);
      assert.equal(body.code, 'ACTIVITY_SERVER_ERROR');
      const left = await counts(id);
      assert.equal(left.activity, 1);
      assert.equal(left.items, 1);
    } finally {
      await db.query('DELETE FROM activity_force_delete_guard WHERE activity_template_id = $1', [id]);
      await db.query('DROP TABLE IF EXISTS activity_force_delete_guard');
      await db.query('DELETE FROM weekly_schedule_item WHERE activity_template_id = $1', [id]);
      await db.query('DELETE FROM activity_template WHERE id = $1', [id]);
    }
  });
});
