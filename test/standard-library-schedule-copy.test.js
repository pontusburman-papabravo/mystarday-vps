'use strict';

/**
 * HTTP integration coverage for POST /api/standard-library/schedules/:id/copy, rewritten in
 * Phase 1A to delegate to the canonical schedule-apply service (src/lib/schedule-apply.js)
 * instead of a second, duplicated day-write loop. See docs/schedule-canonical-architecture.md.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');
const { seedCanonicalLibrary } = require('./helpers/canonical-library-fixture.js');

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

test('standard-library schedule copy route (canonical apply, Phase 1A)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const client = await db.pool.connect();
  try {
    await seedCanonicalLibrary(client);
  } finally {
    client.release();
  }

  const tag = Date.now();
  const password = 'std-lib-copy-pass-1';
  const passwordHash = await hashPassword(password);

  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Std lib copy', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;
  const email = `stdlib-copy-${tag}@example.com`;
  await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, $2, $3, 'Parent', true, true)`,
    [email, passwordHash, familyId]
  );
  const childRes = await db.query(
    `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Barn', '⭐', $2) RETURNING id`,
    [familyId, `barn-stdlib-${tag}`]
  );
  const childId = childRes.rows[0].id;
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role)
     SELECT id, $2, 'primary' FROM parent WHERE email = $1`,
    [email, childId]
  );
  // Grant the standardbibliotek feature (status='live' → globally on, no family_features row needed).
  await db.query(
    `INSERT INTO features (slug, name, status) VALUES ('standardbibliotek', 'Standardbibliotek', 'live')
     ON CONFLICT (slug) DO UPDATE SET status = 'live'`
  );

  const scheduleRes = await db.query(
    `SELECT id FROM default_schedule WHERE canonical_id = 'morning_routine' LIMIT 1`
  );
  const scheduleId = scheduleRes.rows[0].id;

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const session = await loginParent(baseUrl, email, password);
    const headers = {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    };

    // 1) Copy into empty days [1, 2] — should succeed and materialize activities once.
    const first = await fetch(`${baseUrl}/api/standard-library/schedules/${scheduleId}/copy`, {
      method: 'POST', headers,
      body: JSON.stringify({ child_id: childId, days: [1, 2] }),
    });
    const firstBody = await first.json();
    assert.equal(first.status, 201, JSON.stringify(firstBody));
    assert.deepEqual(firstBody.filled_days, [1, 2]);
    assert.ok(firstBody.activities_created > 0);
    assert.equal(firstBody.schedule_canonical_id, 'morning_routine');

    const activityCountAfterFirst = await db.query(
      `SELECT COUNT(*)::int AS n FROM activity_template WHERE family_id = $1`, [familyId]
    );

    // 2) Re-copy into day 3 (new day) — must reuse materialized activities, not duplicate them.
    const second = await fetch(`${baseUrl}/api/standard-library/schedules/${scheduleId}/copy`, {
      method: 'POST', headers,
      body: JSON.stringify({ child_id: childId, days: [3] }),
    });
    const secondBody = await second.json();
    assert.equal(second.status, 201, JSON.stringify(secondBody));
    assert.equal(secondBody.activities_created, 0, 'materialized activities must be reused across apply calls');

    const activityCountAfterSecond = await db.query(
      `SELECT COUNT(*)::int AS n FROM activity_template WHERE family_id = $1`, [familyId]
    );
    assert.equal(activityCountAfterSecond.rows[0].n, activityCountAfterFirst.rows[0].n);

    // 3) Copy into day 1 again WITHOUT overwrite — day already has a schedule, must be skipped.
    const skip = await fetch(`${baseUrl}/api/standard-library/schedules/${scheduleId}/copy`, {
      method: 'POST', headers,
      body: JSON.stringify({ child_id: childId, days: [1] }),
    });
    const skipBody = await skip.json();
    assert.equal(skip.status, 201, JSON.stringify(skipBody));
    assert.deepEqual(skipBody.filled_days, [], 'day 1 already has a schedule — overwrite=false must skip it');

    // 4) Copy into day 1 WITH overwrite — must replace, not merge/duplicate.
    const itemsBefore = await db.query(
      `SELECT COUNT(*)::int AS n FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       WHERE ws.child_id = $1 AND ws.day_of_week = 1`,
      [childId]
    );
    const overwrite = await fetch(`${baseUrl}/api/standard-library/schedules/${scheduleId}/copy`, {
      method: 'POST', headers,
      body: JSON.stringify({ child_id: childId, days: [1], overwrite: true }),
    });
    const overwriteBody = await overwrite.json();
    assert.equal(overwrite.status, 201, JSON.stringify(overwriteBody));
    assert.deepEqual(overwriteBody.filled_days, [1]);
    const itemsAfter = await db.query(
      `SELECT COUNT(*)::int AS n FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       WHERE ws.child_id = $1 AND ws.day_of_week = 1`,
      [childId]
    );
    assert.equal(itemsAfter.rows[0].n, itemsBefore.rows[0].n, 'replace_day must not duplicate items on re-apply');

    // 5) Cross-family child is denied.
    const otherFamily = await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Other', 'Europe/Stockholm', true) RETURNING id`
    );
    const otherChild = await db.query(
      `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Annat', '⭐', $2) RETURNING id`,
      [otherFamily.rows[0].id, `other-stdlib-${tag}`]
    );
    const denied = await fetch(`${baseUrl}/api/standard-library/schedules/${scheduleId}/copy`, {
      method: 'POST', headers,
      body: JSON.stringify({ child_id: otherChild.rows[0].id, days: [1] }),
    });
    assert.equal(denied.status, 403, await denied.text());
  } finally {
    await close();
    await db.cleanup();
  }
});
