'use strict';

const crypto = require('crypto');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function loadObservabilityQueries() {
  delete require.cache[require.resolve('../src/lib/db')];
  delete require.cache[require.resolve('../db/user-observability')];
  return require('../db/user-observability');
}

async function enableTrustedDeviceFlag(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG_KEY]
  );
}

async function resetKpiTables(db) {
  await db.query(`
    TRUNCATE
      analytics_events,
      login_event,
      daily_log_item,
      daily_log,
      child,
      family_trusted_device,
      parent_child,
      parent,
      family
    RESTART IDENTITY CASCADE
  `);
  await enableTrustedDeviceFlag(db);
}

async function enrollParent(http, session, label) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/parent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ platform: 'web', label: label || 'Test phone' }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

async function parentContext(db, session) {
  const parentRow = await db.query(
    'SELECT id, family_id FROM parent WHERE LOWER(email) = LOWER($1)',
    [session.email]
  );
  assert.ok(parentRow.rows[0], 'parent row');
  return parentRow.rows[0];
}

async function insertTdSession(db, familyId, parentId, deviceId, createdAt) {
  await db.query(
    `INSERT INTO analytics_events (family_id, event_type, metadata, created_at)
     VALUES ($1, 'parent_session_started', $2, $3)`,
    [
      familyId,
      JSON.stringify({
        actor_type: 'parent',
        actor_id: parentId,
        trusted_device_id: deviceId,
        device_mode: 'parent',
        source: 'trusted_device_restore_parent',
        session_mode: 'resume',
        platform: 'web',
      }),
      createdAt,
    ]
  );
}

test('trusted device impact KPI definitions', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const { fetchTrustedDeviceImpactKpis, fetchPersistencyWeekComparison } = loadObservabilityQueries();

  try {
  await t.test('two TD sessions on two Stockholm calendar days => families_2plus_days = 1', async () => {
    await resetKpiTables(db);
    const session = await registerAndLogin(http.baseUrl);
    const { id: parentId, family_id: familyId } = await parentContext(db, session);
    const deviceCookies = await enrollParent(http, session, 'Two-day phone');
    const hash = crypto.createHash('sha256').update(deviceCookies.trusted_device).digest('hex');
    const deviceRow = await db.query(
      'SELECT id FROM family_trusted_device WHERE token_hash = $1',
      [hash]
    );
    const deviceId = deviceRow.rows[0].id;

    await db.query('DELETE FROM analytics_events WHERE family_id = $1', [familyId]);
    await insertTdSession(db, familyId, parentId, deviceId, '2026-08-10 10:00:00+02');
    await insertTdSession(db, familyId, parentId, deviceId, '2026-08-11 10:00:00+02');

    const impact = await fetchTrustedDeviceImpactKpis('30d');
    assert.equal(impact.recurring.families_2plus_days, 1);
  });

  await t.test('two TD sessions same Stockholm calendar day does not count as 2+ days', async () => {
    await resetKpiTables(db);
    const session = await registerAndLogin(http.baseUrl);
    const { id: parentId, family_id: familyId } = await parentContext(db, session);
    const deviceCookies = await enrollParent(http, session, 'Same-day phone');
    const hash = crypto.createHash('sha256').update(deviceCookies.trusted_device).digest('hex');
    const deviceRow = await db.query(
      'SELECT id FROM family_trusted_device WHERE token_hash = $1',
      [hash]
    );
    const deviceId = deviceRow.rows[0].id;

    await db.query('DELETE FROM analytics_events WHERE family_id = $1', [familyId]);
    await insertTdSession(db, familyId, parentId, deviceId, '2026-08-12 08:00:00+02');
    await insertTdSession(db, familyId, parentId, deviceId, '2026-08-12 18:00:00+02');

    const impact = await fetchTrustedDeviceImpactKpis('30d');
    const tdFamilies = impact.adoption.td_families;
    assert.ok(tdFamilies >= 1);
    assert.equal(impact.recurring.families_2plus_days, 0);
  });

  await t.test('generic adult_login_failed is excluded from TD friction', async () => {
    await resetKpiTables(db);
    const session = await registerAndLogin(http.baseUrl);
    const { family_id: familyId } = await parentContext(db, session);
    await db.query('DELETE FROM analytics_events WHERE family_id = $1', [familyId]);
    await db.query(
      `INSERT INTO analytics_events (family_id, event_type, metadata, created_at)
       VALUES ($1, 'adult_login_failed', $2, NOW())`,
      [familyId, JSON.stringify({ method: 'email', reason: 'invalid_credentials' })]
    );

    const impact = await fetchTrustedDeviceImpactKpis('7d');
    assert.equal(impact.friction.total_events, 0);
    assert.deepEqual(impact.friction.by_type, {});
  });

  await t.test('TD-related restore failure is counted as TD friction', async () => {
    await resetKpiTables(db);
    const session = await registerAndLogin(http.baseUrl);
    const { family_id: familyId } = await parentContext(db, session);
    await db.query('DELETE FROM analytics_events WHERE family_id = $1', [familyId]);
    await db.query(
      `INSERT INTO analytics_events (family_id, event_type, metadata, created_at)
       VALUES ($1, 'child_context_restore_failed', $2, NOW())`,
      [familyId, JSON.stringify({ code: 'TRUSTED_DEVICE_INVALID', source: 'cold_start' })]
    );

    const impact = await fetchTrustedDeviceImpactKpis('7d');
    assert.equal(impact.friction.total_events, 1);
    assert.equal(impact.friction.by_type.child_context_restore_failed, 1);
  });

  await t.test('Successful Routine Day counts family with all daily_log items completed', async () => {
    await resetKpiTables(db);
    const session = await registerAndLogin(http.baseUrl);
    const { id: parentId, family_id: familyId } = await parentContext(db, session);
    const deviceCookies = await enrollParent(http, session, 'Routine day phone');
    const hash = crypto.createHash('sha256').update(deviceCookies.trusted_device).digest('hex');
    const deviceRow = await db.query(
      'SELECT id FROM family_trusted_device WHERE token_hash = $1',
      [hash]
    );
    const deviceId = deviceRow.rows[0].id;

    const childId = await createChild(http.baseUrl, session, {
      name: 'RoutineKid',
      emoji: '⭐',
    });

    await db.query('DELETE FROM analytics_events WHERE family_id = $1', [familyId]);
    await insertTdSession(db, familyId, parentId, deviceId, new Date());

    const log = await db.query(
      `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
      [childId]
    );
    await db.query(
      `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
       VALUES ($1, 'Tandborstning', 'morgon', 0, 1, true),
              ($1, 'Frukost', 'morgon', 1, 1, true)`,
      [log.rows[0].id]
    );

    const impact = await fetchTrustedDeviceImpactKpis('7d');
    assert.ok(impact.outcomes.td_families_with_routine_day >= 1);
  });

  await t.test('week comparison returns deterministic delta when current window beats previous', async () => {
    await resetKpiTables(db);
    const session = await registerAndLogin(http.baseUrl);
    const { id: parentId, family_id: familyId } = await parentContext(db, session);

    await db.query('DELETE FROM analytics_events WHERE family_id = $1', [familyId]);
    const dayA = new Date(Date.now() - 2 * 86_400_000);
    const dayB = new Date(Date.now() - 1 * 86_400_000);
    const dayOld = new Date(Date.now() - 10 * 86_400_000);

    for (const at of [dayA, dayB]) {
      await db.query(
        `INSERT INTO analytics_events (family_id, event_type, metadata, created_at)
         VALUES ($1, 'parent_session_started', $2, $3)`,
        [
          familyId,
          JSON.stringify({ actor_type: 'parent', actor_id: parentId, platform: 'web' }),
          at,
        ]
      );
    }
    await db.query(
      `INSERT INTO analytics_events (family_id, event_type, metadata, created_at)
       VALUES ($1, 'parent_session_started', $2, $3)`,
      [
        familyId,
        JSON.stringify({ actor_type: 'parent', actor_id: parentId, platform: 'web' }),
        dayOld,
      ]
    );

    const comparison = await fetchPersistencyWeekComparison();
    const metric = comparison.all_families.active_2plus_days;
    assert.ok(metric.count >= 1, 'current window has family with 2+ active days');
    assert.ok(metric.pct !== null);
    assert.ok(metric.delta_pp !== null);
    assert.ok(metric.delta_pp > 0, `expected positive delta, got ${metric.delta_pp}`);
  });
  } finally {
    await http.close();
    await db.cleanup();
  }
});
