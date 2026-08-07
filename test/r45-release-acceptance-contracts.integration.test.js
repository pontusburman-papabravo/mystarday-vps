'use strict';

/**
 * R4.5 release acceptance — idempotency key collision + scoped widget revoke.
 */

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');
const { FLAG_NATIVE, FLAG_COMPLETION } = require('../src/lib/widget-flags');
const { getLocalDateStr } = require('../src/lib/daily-log-generator');

async function enableFlags(db) {
  for (const key of [FLAG_KEY, FLAG_NATIVE, FLAG_COMPLETION]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

async function seedOneStepLog(db, childId, familyId) {
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');
  const tpl = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
     VALUES ($1, 'Acceptance steg', '🪥', 1, 0, 'user') RETURNING id`,
    [familyId]
  );
  await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
  const logRes = await db.query(
    'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
    [childId, dateStr]
  );
  const item = await db.query(
    `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
     VALUES ($1, $2, 'Acceptance steg', '🪥', 1, 0, 'morgon') RETURNING id`,
    [logRes.rows[0].id, tpl.rows[0].id]
  );
  return { dateStr, dailyLogItemId: item.rows[0].id };
}

async function bindParentWidget(baseUrl, parent, childId, installationId) {
  const bindRes = await fetch(`${baseUrl}/api/widget/bindings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(parent.cookies),
      'X-CSRF-Token': parent.csrfToken,
    },
    body: JSON.stringify({
      installation_id: installationId,
      platform: 'ios',
      child_id: childId,
    }),
  });
  const text = await bindRes.text();
  assert.equal(bindRes.status, 201, text);
  return JSON.parse(text);
}

async function sumCompletedStars(db, childId) {
  const res = await db.query(
    `SELECT COALESCE(SUM(dli.star_value), 0)::int AS stars
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1 AND dli.completed = true`,
    [childId]
  );
  return res.rows[0].stars;
}

test('R4.5 acceptance: two idempotency keys on same activity → one completion effect', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableFlags(db);
    const parent = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, parent, { name: 'Idem Barn', emoji: '🦊' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    await seedOneStepLog(db, childId, fam.rows[0].family_id);

    const { binding_token: token } = await bindParentWidget(
      http.baseUrl,
      parent,
      childId,
      'acceptance-idem-inst'
    );

    const nextRes = await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const nextBody = JSON.parse(await nextRes.text());
    assert.equal(nextRes.status, 200, JSON.stringify(nextBody));
    assert.equal(nextBody.status, 'ready');
    const instanceToken = nextBody.activity.instance_token;

    const starsBefore = await sumCompletedStars(db, childId);

    const completeOnce = (idempotencyKey) =>
      fetch(`${http.baseUrl}/api/widget/complete-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          instance_token: instanceToken,
          idempotency_key: idempotencyKey,
        }),
      });

    const [res1, res2] = await Promise.all([
      completeOnce('acceptance-key-1'),
      completeOnce('acceptance-key-2'),
    ]);
    const body1 = JSON.parse(await res1.text());
    const body2 = JSON.parse(await res2.text());
    assert.equal(res1.status, 200, JSON.stringify(body1));
    assert.equal(res2.status, 200, JSON.stringify(body2));

    const statuses = [body1.status, body2.status].sort();
    assert.deepEqual(statuses, ['already_completed', 'completed']);

    const starsAfter = await sumCompletedStars(db, childId);
    assert.equal(starsAfter - starsBefore, 1);

    const completedRows = await db.query(
      `SELECT COUNT(*)::int AS n FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = $1 AND dli.completed = true`,
      [childId]
    );
    assert.equal(completedRows.rows[0].n, 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('R4.5 acceptance: revoke child B access — widget B denied, widget A OK', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableFlags(db);
    const parent = await registerAndLogin(http.baseUrl);
    const childA = await createChild(http.baseUrl, parent, { name: 'Widget A', emoji: '🅰️' });
    const childB = await createChild(http.baseUrl, parent, { name: 'Widget B', emoji: '🅱️' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childA]);
    const familyId = fam.rows[0].family_id;
    await seedOneStepLog(db, childA, familyId);
    await seedOneStepLog(db, childB, familyId);

    const bindA = await bindParentWidget(http.baseUrl, parent, childA, 'widget-a-inst');
    const bindB = await bindParentWidget(http.baseUrl, parent, childB, 'widget-b-inst');

    const okA = await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${bindA.binding_token}` },
    });
    assert.equal(okA.status, 200, await okA.text());

    const okB = await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${bindB.binding_token}` },
    });
    assert.equal(okB.status, 200, await okB.text());

    const parentRow = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
      parent.email.toLowerCase(),
    ]);
    await db.query(
      `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $1
       WHERE parent_id = $1 AND child_id = $2 AND revoked_at IS NULL`,
      [parentRow.rows[0].id, childB]
    );

    const deniedB = await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${bindB.binding_token}` },
    });
    const deniedBody = JSON.parse(await deniedB.text());
    assert.equal(deniedB.status, 403, JSON.stringify(deniedBody));
    assert.equal(deniedBody.status, 'device_revoked');

    const stillA = await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${bindA.binding_token}` },
    });
    const stillBody = JSON.parse(await stillA.text());
    assert.equal(stillA.status, 200, JSON.stringify(stillBody));
    assert.equal(stillBody.status, 'ready');
    assert.ok(stillBody.activity?.instance_token);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
