'use strict';

/**
 * FEAT-1 Phase 5 — integration: custody setup → context → schedule write with custody_home_id.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { resolveWeeklyScheduleId } = require('../src/lib/custody-schedule-resolve');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function authFetch(baseUrl, session, path, { method = 'GET', body } = {}) {
  const headers = {
    Cookie: cookieHeader(session.cookies),
    'X-CSRF-Token': session.csrfToken,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

test('custody API integration: setup → context → custody_home_id schedule write', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ('custody_schedule_beta', true, 'FEAT-1 test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`
    );

    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session, { name: 'Custody Barn' });

    const setup = await authFetch(http.baseUrl, session, '/api/family/custody/setup', {
      method: 'POST',
      body: {},
    });
    assert.equal(setup.res.status, 200, setup.text);
    assert.ok(setup.json.homes.length >= 2);
    const homeA = setup.json.homes[0].id;
    const homeB = setup.json.homes[1].id;

    const pattern = await authFetch(
      http.baseUrl,
      session,
      `/api/family/custody/pattern/${childId}`,
      {
        method: 'PUT',
        body: {
          anchor_date: '2026-06-02',
          week_a_home_id: homeA,
          week_b_home_id: homeB,
          pattern_type: 'alternate_weeks',
          clone_week_b: false,
        },
      }
    );
    assert.equal(pattern.res.status, 200, pattern.text);

    const ctx = await authFetch(
      http.baseUrl,
      session,
      `/api/family/custody/context?childId=${encodeURIComponent(childId)}&date=2026-06-04`
    );
    assert.equal(ctx.res.status, 200, ctx.text);
    assert.equal(ctx.json.active, true);
    assert.ok(ctx.json.activeHome);
    assert.equal(typeof ctx.json.isParentDay, 'boolean');

    const createSchedule = await authFetch(
      http.baseUrl,
      session,
      `/api/children/${childId}/schedules`,
      {
        method: 'POST',
        body: {
          day_of_week: 1,
          custody_home_id: homeA,
        },
      }
    );
    assert.equal(createSchedule.res.status, 201, createSchedule.text);
    assert.equal(createSchedule.json.custody_home_id, homeA);
    assert.equal(createSchedule.json.week_variant, 'a');

    const listByHome = await authFetch(
      http.baseUrl,
      session,
      `/api/children/${childId}/schedules?custody_home_id=${encodeURIComponent(homeA)}`
    );
    assert.equal(listByHome.res.status, 200, listByHome.text);
    assert.equal(listByHome.json.length, 1);
    assert.equal(listByHome.json[0].custody_home_id, homeA);

    const scheduleId = await resolveWeeklyScheduleId(db.pool, childId, '2026-06-01');
    assert.equal(scheduleId, createSchedule.json.id);

    const events = await db.query(
      `SELECT event_type FROM analytics_events
       WHERE family_id = (SELECT family_id FROM parent WHERE LOWER(email) = $1)
         AND event_type IN ('custody_schedule_created', 'custody_schedule_updated')`,
      [session.email.toLowerCase()]
    );
    const types = new Set(events.rows.map((r) => r.event_type));
    assert.ok(types.has('custody_schedule_created'));
    assert.ok(types.has('custody_schedule_updated'));
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('custody backfill migration maps week_variant rows to custody_home_id', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { backfillWeeklyScheduleHomeIds } = require('../src/lib/custody-schedule-migrate');
  const client = await db.pool.connect();

  try {
    const familyRes = await client.query(
      `INSERT INTO family (name, timezone) VALUES ('Backfill Test', 'Europe/Stockholm') RETURNING id`
    );
    const familyId = familyRes.rows[0].id;

    const childRes = await client.query(
      `INSERT INTO child (family_id, name, emoji) VALUES ($1, 'B', '🌟') RETURNING id`,
      [familyId]
    );
    const childId = childRes.rows[0].id;

    const homeARes = await client.query(
      `INSERT INTO custody_home (family_id, label, color, sort_order)
       VALUES ($1, 'A', '#111111', 0) RETURNING id`,
      [familyId]
    );
    const homeBRes = await client.query(
      `INSERT INTO custody_home (family_id, label, color, sort_order)
       VALUES ($1, 'B', '#222222', 1) RETURNING id`,
      [familyId]
    );
    const homeA = homeARes.rows[0].id;
    const homeB = homeBRes.rows[0].id;

    await client.query(
      `INSERT INTO custody_pattern (
         child_id, anchor_date, interval_weeks, week_a_home_id, week_b_home_id,
         pattern_type, configuration
       ) VALUES ($1, '2026-06-01', 2, $2, $3, 'alternate_weeks', $4::jsonb)`,
      [childId, homeA, homeB, JSON.stringify({ home_a: homeA, home_b: homeB })]
    );

    await client.query(
      `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order, week_variant)
       VALUES ($1, 1, 1, 'a'), ($1, 2, 2, 'b')`,
      [childId]
    );

    const updated = await backfillWeeklyScheduleHomeIds(client);
    assert.equal(updated, 2);

    const rows = await client.query(
      `SELECT week_variant, custody_home_id FROM weekly_schedule
       WHERE child_id = $1 ORDER BY day_of_week`,
      [childId]
    );
    assert.equal(rows.rows[0].custody_home_id, homeA);
    assert.equal(rows.rows[1].custody_home_id, homeB);
  } finally {
    client.release();
    await db.cleanup();
  }
});

test('custody override API: exception wins in context resolve', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ('custody_schedule_beta', true, 'FEAT-1C test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`
    );

    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session, { name: 'Override Barn' });

    const setup = await authFetch(http.baseUrl, session, '/api/family/custody/setup', {
      method: 'POST',
      body: {},
    });
    assert.equal(setup.res.status, 200, setup.text);
    const homeA = setup.json.homes[0].id;
    const homeB = setup.json.homes[1].id;

    const pattern = await authFetch(
      http.baseUrl,
      session,
      `/api/family/custody/pattern/${childId}`,
      {
        method: 'PUT',
        body: {
          anchor_date: '2026-06-01',
          week_a_home_id: homeA,
          week_b_home_id: homeB,
          pattern_type: 'alternate_weeks',
          clone_week_b: false,
        },
      }
    );
    assert.equal(pattern.res.status, 200, pattern.text);

    const before = await authFetch(
      http.baseUrl,
      session,
      `/api/family/custody/context?childId=${encodeURIComponent(childId)}&date=2026-06-03`
    );
    assert.equal(before.res.status, 200, before.text);
    const patternHomeId = before.json.activeHome.id;

    const created = await authFetch(
      http.baseUrl,
      session,
      `/api/family/custody/overrides/${childId}`,
      {
        method: 'POST',
        body: {
          start_date: '2026-06-02',
          end_date: '2026-06-04',
          home_id: homeB,
          reason: 'Sportlov',
        },
      }
    );
    assert.equal(created.res.status, 201, created.text);
    assert.equal(created.json.override.home_id, homeB);

    const after = await authFetch(
      http.baseUrl,
      session,
      `/api/family/custody/context?childId=${encodeURIComponent(childId)}&date=2026-06-03`
    );
    assert.equal(after.res.status, 200, after.text);
    assert.equal(after.json.source, 'override');
    assert.equal(after.json.activeHome.id, homeB);
    assert.notEqual(after.json.activeHome.id, patternHomeId);

    const list = await authFetch(
      http.baseUrl,
      session,
      `/api/family/custody/overrides/${childId}`
    );
    assert.equal(list.res.status, 200, list.text);
    assert.equal(list.json.overrides.length, 1);

    const deleted = await authFetch(
      http.baseUrl,
      session,
      `/api/family/custody/overrides/${childId}/${created.json.override.id}`,
      { method: 'DELETE' }
    );
    assert.equal(deleted.res.status, 200, deleted.text);

    const restored = await authFetch(
      http.baseUrl,
      session,
      `/api/family/custody/context?childId=${encodeURIComponent(childId)}&date=2026-06-03`
    );
    assert.equal(restored.res.status, 200, restored.text);
    assert.equal(restored.json.source, 'pattern');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
