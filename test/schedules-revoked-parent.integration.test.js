'use strict';

/**
 * Revoked shared parent must not apply schedule templates or fill-week on a child.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
process.env.AUTHZ_HARDENING_ENABLED = 'true';
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
  const body = JSON.parse(text);
  return { cookies, csrfToken: body.csrfToken };
}

async function seedFamilyWithShared(db, passwordHash, tag) {
  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Schedules revoked', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;

  const primaryRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, $2, $3, 'Primary', true, true) RETURNING id`,
    [`primary-sched-${tag}@example.com`, passwordHash, familyId]
  );
  const primaryId = primaryRes.rows[0].id;

  const sharedEmail = `shared-sched-${tag}@example.com`;
  const sharedRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, $2, $3, 'Shared', true, true) RETURNING id`,
    [sharedEmail, passwordHash, familyId]
  );
  const sharedId = sharedRes.rows[0].id;

  const childRes = await db.query(
    `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Barn', '⭐', $2) RETURNING id`,
    [familyId, `barn-sched-${tag}`]
  );
  const childId = childRes.rows[0].id;

  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary'), ($3, $2, 'shared')`,
    [primaryId, childId, sharedId]
  );

  const actRes = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, time_group)
     VALUES ($1, 'Tänder', '🪥', 1, 10, 'morgon') RETURNING id`,
    [familyId]
  );
  const activityId = actRes.rows[0].id;

  const tplSched = await db.query(
    `INSERT INTO weekly_schedule (family_id, name, sort_order, day_of_week, child_id)
     VALUES ($1, 'Mall', 0, 0, NULL) RETURNING id`,
    [familyId]
  );
  const templateId = tplSched.rows[0].id;

  await db.query(
    `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
     VALUES ($1, $2, 0, 'morgon')`,
    [templateId, activityId]
  );

  const catRes = await db.query(
    `INSERT INTO category (family_id, name, sort_order) VALUES ($1, 'Hem', 0) RETURNING id`,
    [familyId]
  );
  const categoryId = catRes.rows[0].id;

  await db.query(
    `UPDATE activity_template SET category_id = $1 WHERE id = $2`,
    [categoryId, activityId]
  );

  return {
    familyId,
    primaryId,
    sharedId,
    sharedEmail,
    childId,
    templateId,
    categoryId,
    activityId,
  };
}

test('schedules revoked-parent authz (apply, fill-week, cross-family, kill switch)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const password = 'sched-revoked-pass-1';
  const passwordHash = await hashPassword(password);
  const seed = await seedFamilyWithShared(db, passwordHash, tag);

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const sharedSession = await loginParent(baseUrl, seed.sharedEmail, password);

    const applyOk = await fetch(`${baseUrl}/api/schedule-templates/${seed.templateId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(sharedSession.cookies),
        'X-CSRF-Token': sharedSession.csrfToken,
      },
      body: JSON.stringify({ child_id: seed.childId, days: [1], overwrite: true }),
    });
    assert.equal(applyOk.status, 201, await applyOk.text());

    await db.query(
      `UPDATE parent_child SET revoked_at = NOW() WHERE parent_id = $1 AND child_id = $2`,
      [seed.sharedId, seed.childId]
    );

    const applyDenied = await fetch(`${baseUrl}/api/schedule-templates/${seed.templateId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(sharedSession.cookies),
        'X-CSRF-Token': sharedSession.csrfToken,
      },
      body: JSON.stringify({ child_id: seed.childId, days: [2], overwrite: true }),
    });
    assert.equal(applyDenied.status, 403, await applyDenied.text());

    const countAfterRevoke = await db.query(
      `SELECT COUNT(*)::int AS n FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       WHERE ws.child_id = $1`,
      [seed.childId]
    );
    assert.equal(countAfterRevoke.rows[0].n, 1, 'schedule must not change after revoked apply');

    const fillDenied = await fetch(
      `${baseUrl}/api/children/${seed.childId}/schedules/fill-week`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(sharedSession.cookies),
          'X-CSRF-Token': sharedSession.csrfToken,
        },
        body: JSON.stringify({
          template_category_id: seed.categoryId,
          days: [3],
          overwrite: true,
        }),
      }
    );
    assert.equal(fillDenied.status, 403, await fillDenied.text());

    const otherFamily = await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Other', 'Europe/Stockholm', true) RETURNING id`
    );
    const otherEmail = `other-sched-${tag}@example.com`;
    await db.query(
      `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
       VALUES ($1, $2, $3, 'Other', true, true)`,
      [otherEmail, passwordHash, otherFamily.rows[0].id]
    );
    const otherSession = await loginParent(baseUrl, otherEmail, password);
    const crossFamily = await fetch(`${baseUrl}/api/schedule-templates/${seed.templateId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(otherSession.cookies),
        'X-CSRF-Token': otherSession.csrfToken,
      },
      body: JSON.stringify({ child_id: seed.childId, days: [1], overwrite: true }),
    });
    assert.ok(
      crossFamily.status === 403 || crossFamily.status === 404,
      `expected 403 or 404, got ${crossFamily.status}: ${await crossFamily.text()}`
    );
  } finally {
    await close();
    await db.cleanup();
  }

  process.env.AUTHZ_HARDENING_ENABLED = 'false';
  const db2 = await setupTestDb();
  if (db2.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const seed2 = await seedFamilyWithShared(db2, passwordHash, `${tag}-kill`);
  await db2.query(
    `UPDATE parent_child SET revoked_at = NOW() WHERE parent_id = $1 AND child_id = $2`,
    [seed2.sharedId, seed2.childId]
  );
  const { baseUrl: baseUrl2, close: close2 } = await listenApp(createApp);
  try {
    const sharedSession2 = await loginParent(baseUrl2, seed2.sharedEmail, password);
    const res = await fetch(`${baseUrl2}/api/schedule-templates/${seed2.templateId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(sharedSession2.cookies),
        'X-CSRF-Token': sharedSession2.csrfToken,
      },
      body: JSON.stringify({ child_id: seed2.childId, days: [1], overwrite: true }),
    });
    assert.equal(res.status, 403, await res.text());
  } finally {
    process.env.AUTHZ_HARDENING_ENABLED = 'true';
    await close2();
    await db2.cleanup();
  }
});
