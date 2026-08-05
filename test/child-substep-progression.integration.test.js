'use strict';

/**
 * R0-02 — child sub-step progression via child API (canonical persistence).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { childLoginRaw } = require('./helpers/golden-path-fas6.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const DATE = '2026-08-14';
const STEP_NAMES = ['R0SubTröja', 'R0SubByxor', 'R0SubStrumpor'];

function assertSafeIntegrationDatabase() {
  const url = process.env.DATABASE_URL || '';
  assert.ok(url.length > 0, 'DATABASE_URL required');
  assert.ok(!/mock_test/i.test(url), 'mock DATABASE_URL cannot run integration tests');
  const parsed = new URL(url.replace(/^postgres(ql)?:\/\//, 'http://'));
  const host = parsed.hostname || '';
  assert.ok(host === 'localhost' || host === '127.0.0.1', `localhost DB required, got ${host}`);
}

async function getSubSteps(baseUrl, cookies, itemId) {
  const res = await fetch(`${baseUrl}/api/me/daily-log-items/${itemId}/sub-steps`, {
    headers: { Cookie: cookieHeader(cookies) },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, text };
}

async function putSubStep(baseUrl, cookies, csrf, itemId, subStepId, action) {
  const res = await fetch(
    `${baseUrl}/api/me/daily-log-items/${itemId}/sub-steps/${subStepId}/${action}`,
    {
      method: 'PUT',
      headers: {
        Cookie: cookieHeader(cookies),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
    }
  );
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, text };
}

async function putItemComplete(baseUrl, cookies, csrf, itemId) {
  const res = await fetch(`${baseUrl}/api/me/daily-log-items/${itemId}/complete`, {
    method: 'PUT',
    headers: {
      Cookie: cookieHeader(cookies),
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, text };
}

function completedStepIds(body) {
  return (body.sub_steps || []).filter((s) => s.completed).map((s) => s.id);
}

test('R0-02 — sub-step progression, refresh, re-login, single activity completion', async (t) => {
  assertSafeIntegrationDatabase();
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const pin = '5291';
    const childId = await createChild(http.baseUrl, session, {
      name: 'R0SubBarn',
      pin,
      birthday: '2017-04-01',
    });
    const row = await db.query('SELECT username, family_id FROM child WHERE id = $1', [childId]);
    const { username, family_id: familyId } = row.rows[0];

    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
       VALUES ($1, 'Klä på sig', '👕', 2, 0, 'user') RETURNING id`,
      [familyId]
    );
    const templateId = tpl.rows[0].id;

    const stepIds = [];
    for (let i = 0; i < STEP_NAMES.length; i++) {
      const ins = await db.query(
        `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
         VALUES ($1, $2, '⭐', $3) RETURNING id`,
        [templateId, STEP_NAMES[i], i]
      );
      stepIds.push(ins.rows[0].id);
    }

    await db.query(
      'DELETE FROM daily_log_item_sub_step WHERE daily_log_item_id IN (SELECT id FROM daily_log_item WHERE daily_log_id IN (SELECT id FROM daily_log WHERE child_id = $1 AND date = $2))',
      [childId, DATE]
    );
    await db.query(
      'DELETE FROM daily_log_item WHERE daily_log_id IN (SELECT id FROM daily_log WHERE child_id = $1 AND date = $2)',
      [childId, DATE]
    );
    await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, DATE]);
    const logRes = await db.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, DATE]
    );
    const itemRes = await db.query(
      `INSERT INTO daily_log_item
         (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section, completed)
       VALUES ($1, $2, 'Klä på sig', '👕', 2, 0, 'morgon', false)
       RETURNING id`,
      [logRes.rows[0].id, templateId]
    );
    const itemId = itemRes.rows[0].id;

    const cl = await childLoginRaw(http.baseUrl, { username, pin });
    assert.equal(cl.status, 200, cl.text);
    const { cookies, csrfToken } = cl;

    let subs = await getSubSteps(http.baseUrl, cookies, itemId);
    assert.equal(subs.status, 200, subs.text);
    assert.deepEqual(subs.body.sub_steps.map((s) => s.id), stepIds);
    assert.deepEqual(completedStepIds(subs.body), []);

    const c1 = await putSubStep(http.baseUrl, cookies, csrfToken, itemId, stepIds[0], 'complete');
    assert.equal(c1.status, 200, c1.text);

    const [dupA, dupB] = await Promise.all([
      putSubStep(http.baseUrl, cookies, csrfToken, itemId, stepIds[0], 'complete'),
      putSubStep(http.baseUrl, cookies, csrfToken, itemId, stepIds[0], 'complete'),
    ]);
    assert.equal(dupA.status, 200);
    assert.equal(dupB.status, 200);

    subs = await getSubSteps(http.baseUrl, cookies, itemId);
    assert.deepEqual(completedStepIds(subs.body), [stepIds[0]]);

    const itemRow = await db.query('SELECT completed FROM daily_log_item WHERE id = $1', [itemId]);
    assert.equal(itemRow.rows[0].completed, false);

    const c2 = await putSubStep(http.baseUrl, cookies, csrfToken, itemId, stepIds[1], 'complete');
    assert.equal(c2.status, 200, c2.text);

    subs = await getSubSteps(http.baseUrl, cookies, itemId);
    assert.deepEqual(completedStepIds(subs.body), [stepIds[0], stepIds[1]]);

    const subsRefresh = await getSubSteps(http.baseUrl, cookies, itemId);
    assert.deepEqual(completedStepIds(subsRefresh.body), [stepIds[0], stepIds[1]]);

    const cl2 = await childLoginRaw(http.baseUrl, { username, pin });
    assert.equal(cl2.status, 200, cl2.text);
    const subsRelogin = await getSubSteps(http.baseUrl, cl2.cookies, itemId);
    assert.deepEqual(completedStepIds(subsRelogin.body), [stepIds[0], stepIds[1]]);

    const c3 = await putSubStep(http.baseUrl, cl2.cookies, cl2.csrfToken, itemId, stepIds[2], 'complete');
    assert.equal(c3.status, 200, c3.text);

    const done1 = await putItemComplete(http.baseUrl, cl2.cookies, cl2.csrfToken, itemId);
    assert.equal(done1.status, 200, done1.text);
    assert.equal(done1.body.completed, true);

    const done2 = await putItemComplete(http.baseUrl, cl2.cookies, cl2.csrfToken, itemId);
    assert.equal(done2.status, 200, done2.text);
    assert.equal(done2.body.completed, true);

    const countRes = await db.query(
      `SELECT COUNT(*)::int AS n FROM daily_log_item WHERE id = $1 AND completed = true`,
      [itemId]
    );
    assert.equal(countRes.rows[0].n, 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
