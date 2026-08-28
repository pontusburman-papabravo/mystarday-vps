'use strict';

/**
 * HTTP integration coverage for the Phase 1B canonical apply endpoints
 * (src/routes/schedules/apply.js): apply-source, apply-activity, copy-recurring-day,
 * save-as-template. See docs/schedule-canonical-architecture.md "Phase 1B".
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

test('Phase 1B canonical apply routes', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const password = 'phase1b-routes-pass-1';
  const passwordHash = await hashPassword(password);

  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Phase 1B routes', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;
  const email = `phase1b-routes-${tag}@example.com`;
  await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, $2, $3, 'Parent', true, true)`,
    [email, passwordHash, familyId]
  );
  const childRes = await db.query(
    `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Barn', '⭐', $2) RETURNING id`,
    [familyId, `barn-p1b-${tag}`]
  );
  const childId = childRes.rows[0].id;
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) SELECT id, $2, 'primary' FROM parent WHERE email = $1`,
    [email, childId]
  );
  const activityRes = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order)
     VALUES ($1, 'Borsta tänderna', '🪥', 1, 0) RETURNING id`,
    [familyId]
  );
  const activityId = activityRes.rows[0].id;

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const session = await loginParent(baseUrl, email, password);
    const headers = {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    };

    // 1) apply-activity — "+ Lägg till → Aktivitet" (§1B.1), default merge, operation_id retry.
    const operationId1 = `test-op-activity-${tag}`;
    const applyActivity = await fetch(`${baseUrl}/api/children/${childId}/schedules/apply-activity`, {
      method: 'POST', headers,
      body: JSON.stringify({ activity_template_id: activityId, days: [1, 3], section: 'morgon', operation_id: operationId1 }),
    });
    const applyActivityBody = await applyActivity.json();
    assert.equal(applyActivity.status, 201, JSON.stringify(applyActivityBody));
    assert.deepEqual(applyActivityBody.applied_days, [1, 3]);
    assert.equal(applyActivityBody.replayed, false);

    // Retry with the SAME operation_id (network retry) must replay, not duplicate.
    const retryActivity = await fetch(`${baseUrl}/api/children/${childId}/schedules/apply-activity`, {
      method: 'POST', headers,
      body: JSON.stringify({ activity_template_id: activityId, days: [1, 3], section: 'morgon', operation_id: operationId1 }),
    });
    const retryActivityBody = await retryActivity.json();
    assert.equal(retryActivity.status, 201);
    assert.equal(retryActivityBody.replayed, true);

    const itemsMonday = await db.query(
      `SELECT COUNT(*)::int AS n FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       WHERE ws.child_id = $1 AND ws.day_of_week = 1`,
      [childId]
    );
    assert.equal(itemsMonday.rows[0].n, 1, 'retry with the same operation_id must not duplicate the item');

    // 2) A DIFFERENT payload under the SAME operation_id must be rejected (§1B.9), not silently
    // applied as a new command.
    const conflictingRetry = await fetch(`${baseUrl}/api/children/${childId}/schedules/apply-activity`, {
      method: 'POST', headers,
      body: JSON.stringify({ activity_template_id: activityId, days: [2], section: 'morgon', operation_id: operationId1 }),
    });
    assert.equal(conflictingRetry.status, 409, await conflictingRetry.text());
    const day2 = await db.query(
      `SELECT COUNT(*)::int AS n FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       WHERE ws.child_id = $1 AND ws.day_of_week = 2`,
      [childId]
    );
    assert.equal(day2.rows[0].n, 0, 'a conflicting operation_id reuse must not mutate day 2');

    // 3) copy-recurring-day — copy Monday to Thursday, merge default (§1B.4/§1B.21).
    const copyDay = await fetch(`${baseUrl}/api/children/${childId}/schedules/copy-recurring-day`, {
      method: 'POST', headers,
      body: JSON.stringify({ source_day_of_week: 1, target_days: [4] }),
    });
    const copyDayBody = await copyDay.json();
    assert.equal(copyDay.status, 201, JSON.stringify(copyDayBody));
    assert.deepEqual(copyDayBody.applied_days, [4]);
    const thursdayItems = await db.query(
      `SELECT wsi.activity_template_id FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       WHERE ws.child_id = $1 AND ws.day_of_week = 4`,
      [childId]
    );
    assert.deepEqual(thursdayItems.rows.map((r) => r.activity_template_id), [activityId]);

    // 4) save-as-template — "Spara dagen som mall" (§1B.5/§1B.22); templates are copies, and
    // the endpoint response never exposes internal source-type jargon to the client.
    const saveTemplate = await fetch(`${baseUrl}/api/children/${childId}/schedules/save-as-template`, {
      method: 'POST', headers,
      body: JSON.stringify({ day_of_week: 1, template_name: 'Min morgonmall' }),
    });
    const saveTemplateBody = await saveTemplate.json();
    assert.equal(saveTemplate.status, 201, JSON.stringify(saveTemplateBody));
    assert.equal(saveTemplateBody.template_name, 'Min morgonmall');
    assert.ok(saveTemplateBody.template_id);

    const templateRow = await db.query(
      `SELECT child_id FROM weekly_schedule WHERE id = $1`, [saveTemplateBody.template_id]
    );
    assert.equal(templateRow.rows[0].child_id, null, 'saved template must be a real family_template row (child_id IS NULL)');

    // 5) apply-source — "Från mall → Mina mallar" applying the just-saved template back onto
    // Wednesday (family_template canonical source, §1B.2).
    const applySource = await fetch(`${baseUrl}/api/children/${childId}/schedules/apply-source`, {
      method: 'POST', headers,
      body: JSON.stringify({ source: { type: 'family_template', id: saveTemplateBody.template_id }, days: [3] }),
    });
    const applySourceBody = await applySource.json();
    assert.equal(applySource.status, 201, JSON.stringify(applySourceBody));
    assert.deepEqual(applySourceBody.applied_days, [3]);
    assert.equal(applySourceBody.source.source_type, 'family_template');

    // 7) Phase 1B custody hardening §6/§8-11 — custody_home_id in the request body is shaped
    // into custodyContext and actually reaches the canonical service for all four routes.
    const homeA = await db.query(`INSERT INTO custody_home (family_id, label) VALUES ($1, 'Hos mamma') RETURNING id`, [familyId]);
    const homeAId = homeA.rows[0].id;

    const applyActivityCustody = await fetch(`${baseUrl}/api/children/${childId}/schedules/apply-activity`, {
      method: 'POST', headers,
      body: JSON.stringify({ activity_template_id: activityId, days: [5], section: 'kvall', custody_home_id: homeAId }),
    });
    const applyActivityCustodyBody = await applyActivityCustody.json();
    assert.equal(applyActivityCustody.status, 201, JSON.stringify(applyActivityCustodyBody));
    const homeAFriday = await db.query(
      `SELECT COUNT(*)::int AS n FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       WHERE ws.child_id = $1 AND ws.day_of_week = 5 AND ws.custody_home_id = $2`,
      [childId, homeAId]
    );
    assert.equal(homeAFriday.rows[0].n, 1, 'apply-activity must forward custody_home_id into the scoped weekly_schedule row');
    const genericFriday = await db.query(
      `SELECT COUNT(*)::int AS n FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       WHERE ws.child_id = $1 AND ws.day_of_week = 5 AND ws.custody_home_id IS NULL`,
      [childId]
    );
    assert.equal(genericFriday.rows[0].n, 0, 'apply-activity with custody_home_id must not also touch the generic row');

    const applySourceCustody = await fetch(`${baseUrl}/api/children/${childId}/schedules/apply-source`, {
      method: 'POST', headers,
      body: JSON.stringify({ source: { type: 'family_template', id: saveTemplateBody.template_id }, days: [6], custody_home_id: homeAId }),
    });
    const applySourceCustodyBody = await applySourceCustody.json();
    assert.equal(applySourceCustody.status, 201, JSON.stringify(applySourceCustodyBody));
    const homeASaturday = await db.query(
      `SELECT COUNT(*)::int AS n FROM weekly_schedule ws WHERE ws.child_id = $1 AND ws.day_of_week = 6 AND ws.custody_home_id = $2`,
      [childId, homeAId]
    );
    assert.equal(homeASaturday.rows[0].n, 1, 'apply-source must forward custody_home_id');

    const copyDayCustody = await fetch(`${baseUrl}/api/children/${childId}/schedules/copy-recurring-day`, {
      method: 'POST', headers,
      body: JSON.stringify({ source_day_of_week: 5, target_days: [0], custody_home_id: homeAId }),
    });
    const copyDayCustodyBody = await copyDayCustody.json();
    assert.equal(copyDayCustody.status, 201, JSON.stringify(copyDayCustodyBody));
    const homeASunday = await db.query(
      `SELECT COUNT(*)::int AS n FROM weekly_schedule ws WHERE ws.child_id = $1 AND ws.day_of_week = 0 AND ws.custody_home_id = $2`,
      [childId, homeAId]
    );
    assert.equal(homeASunday.rows[0].n, 1, 'copy-recurring-day must forward custody_home_id for both source read and target write');

    const saveTemplateCustody = await fetch(`${baseUrl}/api/children/${childId}/schedules/save-as-template`, {
      method: 'POST', headers,
      body: JSON.stringify({ day_of_week: 5, template_name: 'Mammas fredag', custody_home_id: homeAId }),
    });
    const saveTemplateCustodyBody = await saveTemplateCustody.json();
    assert.equal(saveTemplateCustody.status, 201, JSON.stringify(saveTemplateCustodyBody));
    const savedTemplateRow = await db.query(
      `SELECT custody_home_id FROM weekly_schedule WHERE id = $1`, [saveTemplateCustodyBody.template_id]
    );
    assert.equal(savedTemplateRow.rows[0].custody_home_id, null, 'save-as-template must read home A but the resulting template stays custody-neutral');

    // 7b) foreign-family custody_home_id via the route is denied deterministically, no writes.
    const foreignFamily = await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Foreign', 'Europe/Stockholm', true) RETURNING id`
    );
    const foreignHome = await db.query(`INSERT INTO custody_home (family_id, label) VALUES ($1, 'Foreign home') RETURNING id`, [foreignFamily.rows[0].id]);
    const foreignCustodyDenied = await fetch(`${baseUrl}/api/children/${childId}/schedules/apply-activity`, {
      method: 'POST', headers,
      body: JSON.stringify({ activity_template_id: activityId, days: [2], custody_home_id: foreignHome.rows[0].id }),
    });
    assert.equal(foreignCustodyDenied.status, 403, await foreignCustodyDenied.text());

    // 6) Cross-family child is denied at the route layer (actor authz) for every endpoint.
    const otherFamily = await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Other', 'Europe/Stockholm', true) RETURNING id`
    );
    const otherChild = await db.query(
      `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Annat', '⭐', $2) RETURNING id`,
      [otherFamily.rows[0].id, `other-p1b-${tag}`]
    );
    const denied = await fetch(`${baseUrl}/api/children/${otherChild.rows[0].id}/schedules/apply-activity`, {
      method: 'POST', headers,
      body: JSON.stringify({ activity_template_id: activityId, days: [1] }),
    });
    assert.equal(denied.status, 403, await denied.text());
  } finally {
    await close();
    await db.cleanup();
  }
});
