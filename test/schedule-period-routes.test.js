'use strict';

/**
 * HTTP integration coverage for the Phase 2 canonical Special Period endpoints
 * (src/routes/schedules/periods.js): GET/POST/PATCH/DELETE
 * /api/children/:childId/schedule-periods[/:periodId]. See
 * docs/schedule-canonical-architecture.md "Phase 2".
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function loginParent(baseUrl, email, password) {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await loginRes.text();
  assert.equal(loginRes.status, 200, text);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { cookies, csrfToken: JSON.parse(text).csrfToken };
}

test('Phase 2 canonical schedule-period routes', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const password = 'phase2-routes-pass-1';
  const passwordHash = await hashPassword(password);

  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Phase 2 routes', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;
  const email = `phase2-routes-${tag}@example.com`;
  await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, $2, $3, 'Parent', true, true)`,
    [email, passwordHash, familyId]
  );
  const childRes = await db.query(
    `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Barn', '⭐', $2) RETURNING id`,
    [familyId, `barn-p2-${tag}`]
  );
  const childId = childRes.rows[0].id;
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) SELECT id, $2, 'primary' FROM parent WHERE email = $1`,
    [email, childId]
  );
  const activityRes = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order)
     VALUES ($1, 'Simskola', '🏊', 1, 0) RETURNING id`,
    [familyId]
  );
  const activityId = activityRes.rows[0].id;
  const templateRes = await db.query(
    `INSERT INTO weekly_schedule (family_id, name, sort_order, day_of_week, child_id) VALUES ($1, 'Lovmall', 0, 0, NULL) RETURNING id`,
    [familyId]
  );
  const templateId = templateRes.rows[0].id;
  await db.query(
    `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section) VALUES ($1, $2, 0, 'dag')`,
    [templateId, activityId]
  );

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const session = await loginParent(baseUrl, email, password);
    const headers = {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    };

    // 1) GET — empty list initially
    const emptyList = await fetch(`${baseUrl}/api/children/${childId}/schedule-periods`, { headers });
    const emptyBody = await emptyList.json();
    assert.equal(emptyList.status, 200, JSON.stringify(emptyBody));
    assert.deepEqual(emptyBody.periods, []);

    // 2) POST — create a period
    const operationId1 = `test-op-period-${tag}`;
    const create = await fetch(`${baseUrl}/api/children/${childId}/schedule-periods`, {
      method: 'POST', headers,
      body: JSON.stringify({
        name: 'Sommarlov', start_date: '2027-06-01', end_date: '2027-06-03',
        source: { type: 'family_template', id: templateId }, operation_id: operationId1,
      }),
    });
    const createBody = await create.json();
    assert.equal(create.status, 201, JSON.stringify(createBody));
    assert.deepEqual(createBody.applied_dates, ['2027-06-01', '2027-06-02', '2027-06-03']);
    const periodId = createBody.period_id;

    // Retry with the SAME operation_id must replay, not duplicate.
    const retryCreate = await fetch(`${baseUrl}/api/children/${childId}/schedule-periods`, {
      method: 'POST', headers,
      body: JSON.stringify({
        name: 'Sommarlov', start_date: '2027-06-01', end_date: '2027-06-03',
        source: { type: 'family_template', id: templateId }, operation_id: operationId1,
      }),
    });
    const retryBody = await retryCreate.json();
    assert.equal(retryCreate.status, 201);
    assert.equal(retryBody.replayed, true);

    // 3) GET — list now shows the period
    const listAfterCreate = await fetch(`${baseUrl}/api/children/${childId}/schedule-periods`, { headers });
    const listBody = await listAfterCreate.json();
    assert.equal(listBody.periods.length, 1, 'a replayed create must not duplicate the period row');
    assert.equal(listBody.periods[0].id, periodId);

    // 4) PATCH — rename only, no re-materialization
    const patch = await fetch(`${baseUrl}/api/children/${childId}/schedule-periods/${periodId}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ name: 'Sommarlov v2' }),
    });
    const patchBody = await patch.json();
    assert.equal(patch.status, 200, JSON.stringify(patchBody));
    assert.equal(patchBody.name, 'Sommarlov v2');
    assert.equal(patchBody.content_changed, false);

    // 5) Overlapping period rejected
    const overlap = await fetch(`${baseUrl}/api/children/${childId}/schedule-periods`, {
      method: 'POST', headers,
      body: JSON.stringify({
        name: 'Overlap', start_date: '2027-06-02', end_date: '2027-06-05',
        source: { type: 'family_template', id: templateId },
      }),
    });
    assert.equal(overlap.status, 409, await overlap.text());

    // 6) DELETE — removes the period and its materialized special days
    const del = await fetch(`${baseUrl}/api/children/${childId}/schedule-periods/${periodId}`, {
      method: 'DELETE', headers,
    });
    const delBody = await del.json();
    assert.equal(del.status, 200, JSON.stringify(delBody));
    assert.deepEqual(delBody.removed_dates, ['2027-06-01', '2027-06-02', '2027-06-03']);

    const sdCheck = await db.query(
      `SELECT COUNT(*)::int AS n FROM special_day_schedule WHERE child_id = $1 AND date BETWEEN '2027-06-01' AND '2027-06-03'`,
      [childId]
    );
    assert.equal(sdCheck.rows[0].n, 0, 'materialized special days must be removed with the period');

    const listAfterDelete = await fetch(`${baseUrl}/api/children/${childId}/schedule-periods`, { headers });
    assert.deepEqual((await listAfterDelete.json()).periods, []);

    // 7) Cross-family child is denied at the route layer.
    const otherFamily = await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Other', 'Europe/Stockholm', true) RETURNING id`
    );
    const otherChild = await db.query(
      `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Annat', '⭐', $2) RETURNING id`,
      [otherFamily.rows[0].id, `other-p2-${tag}`]
    );
    const denied = await fetch(`${baseUrl}/api/children/${otherChild.rows[0].id}/schedule-periods`, {
      method: 'POST', headers,
      body: JSON.stringify({
        name: 'Bad', start_date: '2027-06-01', end_date: '2027-06-01',
        source: { type: 'family_template', id: templateId },
      }),
    });
    assert.equal(denied.status, 403, await denied.text());

    // 8) Missing source is a deterministic 400, no writes.
    const missingSource = await fetch(`${baseUrl}/api/children/${childId}/schedule-periods`, {
      method: 'POST', headers,
      body: JSON.stringify({ name: 'No source', start_date: '2027-06-01', end_date: '2027-06-01' }),
    });
    assert.equal(missingSource.status, 400, await missingSource.text());
  } finally {
    await close();
    await db.cleanup();
  }
});
