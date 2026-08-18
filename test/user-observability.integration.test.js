'use strict';

/**
 * User observability — session telemetry, login_event separation, admin aggregates.
 */

const crypto = require('crypto');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function enableTrustedDeviceFlag(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG_KEY]
  );
}

async function enrollParent(http, session, label) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/parent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ platform: 'web', label: label || 'Parent phone' }),
  });
  const text = await enrollRes.text();
  assert.equal(enrollRes.status, 201, text);
  const body = JSON.parse(text);
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

function trustedOnly(cookies) {
  return cookies?.trusted_device ? { trusted_device: cookies.trusted_device } : cookies;
}

async function waitForAnalytics(db, familyId, eventType, { timeoutMs = 3000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { rows } = await db.query(
      `SELECT metadata FROM analytics_events
       WHERE family_id = $1 AND event_type = $2
       ORDER BY created_at DESC LIMIT 1`,
      [familyId, eventType]
    );
    if (rows.length) return rows[0].metadata;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

async function makeAdmin(db, session) {
  await db.query('UPDATE parent SET is_admin = true WHERE LOWER(email) = $1', [
    session.email.toLowerCase(),
  ]);
  const loginRes = await fetch(`${process.env._TEST_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: session.email, password: session.password }),
  });
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

test('user observability integration matrix', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  process.env._TEST_BASE_URL = http.baseUrl;

  try {
    await enableTrustedDeviceFlag(db);

    await t.test('trusted parent restore emits parent_session_started with actor metadata', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const parentRow = await db.query('SELECT id, family_id FROM parent WHERE email = $1', [session.email]);
      const parentId = parentRow.rows[0].id;
      const familyId = parentRow.rows[0].family_id;
      const deviceCookies = await enrollParent(http, session);

      const beforeLoginEvents = await db.query(
        'SELECT COUNT(*)::int AS n FROM login_event WHERE user_id = $1',
        [parentId]
      );

      const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(trustedOnly(deviceCookies)),
        },
        body: JSON.stringify({}),
      });
      assert.equal(restoreRes.status, 200);

      const afterLoginEvents = await db.query(
        'SELECT COUNT(*)::int AS n FROM login_event WHERE user_id = $1',
        [parentId]
      );
      assert.equal(
        afterLoginEvents.rows[0].n,
        beforeLoginEvents.rows[0].n,
        'trusted restore must not create login_event'
      );

      const meta = await waitForAnalytics(db, familyId, 'parent_session_started');
      assert.ok(meta, 'expected parent_session_started analytics event');
      assert.equal(meta.actor_type, 'parent');
      assert.equal(meta.actor_id, parentId);
      assert.ok(meta.trusted_device_id);
      assert.ok(UUID_RE.test(meta.trusted_device_id));
      const serialized = JSON.stringify(meta);
      assert.doesNotMatch(serialized, /trusted_device_raw|token_hash|refresh_token/);
      if (deviceCookies.trusted_device) {
        assert.doesNotMatch(serialized, new RegExp(deviceCookies.trusted_device));
      }
    });

    await t.test('trusted child restore emits child_session_started with actor metadata', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const parentRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
      const familyId = parentRow.rows[0].family_id;
      const childId = await createChild(http.baseUrl, session, { name: 'ObsKid', emoji: '⭐' });

      const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ platform: 'web', label: 'Shared iPad' }),
      });
      assert.equal(enrollRes.status, 201);
      let deviceCookies = { ...session.cookies };
      for (const header of getSetCookieHeaders(enrollRes)) {
        deviceCookies = mergeCookies(deviceCookies, [header]);
      }

      const selectRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-child`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(deviceCookies),
        },
        body: JSON.stringify({ child_id: childId }),
      });
      const selectText = await selectRes.text();
      assert.equal(selectRes.status, 200, selectText);

      const meta = await waitForAnalytics(db, familyId, 'child_session_started');
      assert.ok(meta);
      assert.equal(meta.actor_type, 'child');
      assert.equal(meta.actor_id, childId);
      assert.ok(meta.trusted_device_id);
    });

    await t.test('password login creates login_event and parent_session_started', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const parentRow = await db.query('SELECT id, family_id FROM parent WHERE email = $1', [session.email]);
      const parentId = parentRow.rows[0].id;
      const familyId = parentRow.rows[0].family_id;

      const loginEvents = await db.query(
        'SELECT COUNT(*)::int AS n FROM login_event WHERE user_id = $1',
        [parentId]
      );
      assert.ok(loginEvents.rows[0].n >= 1);

      const meta = await waitForAnalytics(db, familyId, 'parent_session_started');
      assert.ok(meta);
      assert.equal(meta.actor_type, 'parent');
      assert.equal(meta.actor_id, parentId);
      assert.equal(meta.session_mode, 'fresh');
    });

    await t.test('admin families-grouped returns observability per parent and child', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const adminCookies = await makeAdmin(db, session);
      const childId = await createChild(http.baseUrl, session, { name: 'AdminObs', emoji: '🌟' });

      const res = await fetch(`${http.baseUrl}/api/admin/families-grouped`, {
        headers: { Cookie: cookieHeader(adminCookies) },
      });
      const text = await res.text();
      assert.equal(res.status, 200, text);
      const families = JSON.parse(text);
      assert.ok(Array.isArray(families));
      const family = families.find((f) =>
        (f.children || []).some((c) => c.id === childId)
      );
      assert.ok(family, 'family with child not found');
      const parent = (family.parents || []).find((p) => p.email === session.email);
      assert.ok(parent);
      assert.ok(parent.observability);
      assert.ok('last_authenticated_at' in parent.observability);
      assert.ok('last_session_started_at' in parent.observability);
      assert.ok('last_active_at' in parent.observability);

      const child = (family.children || []).find((c) => c.id === childId);
      assert.ok(child.observability);
      assert.equal(child.observability.last_authenticated_at, null);

      if (family.trusted_devices) {
        for (const d of family.trusted_devices) {
          assert.ok(!d.token);
          assert.ok(!d.token_hash);
        }
      }
    });

    await t.test('non-admin denied on usage analytics', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const res = await fetch(`${http.baseUrl}/api/admin/analytics/usage`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      assert.equal(res.status, 403);
    });

    await t.test('usage KPIs deduplicate actors within period', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const adminCookies = await makeAdmin(db, session);
      const parentRow = await db.query('SELECT id, family_id FROM parent WHERE email = $1', [session.email]);
      const { id: parentId, family_id: familyId } = parentRow.rows[0];

      await db.query(
        `INSERT INTO analytics_events (family_id, event_type, metadata)
         VALUES ($1, 'parent_session_started', $2),
                ($1, 'parent_session_started', $2)`,
        [
          familyId,
          JSON.stringify({
            actor_type: 'parent',
            actor_id: parentId,
            source: 'trusted_device_restore_parent',
            session_mode: 'resume',
            platform: 'web',
          }),
        ]
      );

      const res = await fetch(`${http.baseUrl}/api/admin/analytics/usage?period=24h`, {
        headers: { Cookie: cookieHeader(adminCookies) },
      });
      assert.equal(res.status, 200);
      const kpis = await res.json();
      assert.ok(kpis.active_parents >= 1);
      assert.ok(kpis.active_people >= 1);
    });

    await t.test('usage KPIs include trusted device aggregates at multiple levels', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const adminCookies = await makeAdmin(db, session);
      const parentRow = await db.query('SELECT id, family_id FROM parent WHERE email = $1', [session.email]);
      const { id: parentId, family_id: familyId } = parentRow.rows[0];

      const deviceCookies = await enrollParent(http, session, 'Aggregate KPI phone');
      const hash = crypto.createHash('sha256').update(deviceCookies.trusted_device).digest('hex');
      const deviceRow = await db.query(
        'SELECT id FROM family_trusted_device WHERE token_hash = $1',
        [hash]
      );
      const deviceId = deviceRow.rows[0].id;

      await db.query(
        `UPDATE family_trusted_device SET last_seen_at = NOW() WHERE id = $1`,
        [deviceId]
      );

      await db.query(
        `INSERT INTO analytics_events (family_id, event_type, metadata)
         VALUES ($1, 'parent_session_started', $2)`,
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
        ]
      );

      const res = await fetch(`${http.baseUrl}/api/admin/analytics/usage?period=24h`, {
        headers: { Cookie: cookieHeader(adminCookies) },
      });
      assert.equal(res.status, 200);
      const kpis = await res.json();
      assert.ok(kpis.trusted_devices, 'trusted_devices aggregate block');
      const td = kpis.trusted_devices;
      assert.ok(td.families_enrolled >= 1);
      assert.ok(td.active_devices >= 1);
      assert.equal(td.active_by_mode.parent, td.active_devices);
      assert.ok(td.devices_seen >= 1);
      assert.ok(td.families_with_device_seen >= 1);
      assert.ok(td.sessions >= 1);
      assert.ok(td.distinct_devices_in_sessions >= 1);
      assert.ok(td.families_with_sessions >= 1);
      assert.ok(td.sessions_by_mode.parent >= 1);
      assert.equal(kpis.trusted_device_sessions, td.sessions);
    });

    await t.test('usage KPIs include trusted device impact funnel metrics', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const adminCookies = await makeAdmin(db, session);
      const parentRow = await db.query('SELECT id, family_id FROM parent WHERE email = $1', [session.email]);
      const { id: parentId, family_id: familyId } = parentRow.rows[0];

      const deviceCookies = await enrollParent(http, session, 'Impact funnel phone');
      const hash = crypto.createHash('sha256').update(deviceCookies.trusted_device).digest('hex');
      const deviceRow = await db.query(
        'SELECT id FROM family_trusted_device WHERE token_hash = $1',
        [hash]
      );
      const deviceId = deviceRow.rows[0].id;

      await db.query(
        `INSERT INTO analytics_events (family_id, event_type, metadata, created_at)
         VALUES ($1, 'parent_session_started', $2, NOW() - INTERVAL '2 days'),
                ($1, 'parent_session_started', $2, NOW())`,
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
        ]
      );

      await db.query(
        `INSERT INTO analytics_events (family_id, event_type, metadata, created_at)
         VALUES ($1, 'child_context_restore_failed', $2, NOW())`,
        [familyId, JSON.stringify({ code: 'TRUSTED_DEVICE_INVALID', source: 'test' })]
      );

      const res = await fetch(`${http.baseUrl}/api/admin/analytics/usage?period=7d`, {
        headers: { Cookie: cookieHeader(adminCookies) },
      });
      assert.equal(res.status, 200);
      const kpis = await res.json();
      const impact = kpis.trusted_devices?.impact;
      assert.ok(impact, 'impact block');
      assert.ok(impact.adoption);
      assert.ok(impact.adoption.adoption_pct !== undefined);
      assert.ok(impact.recurring.families_2plus_days >= 1);
      assert.ok(impact.friction.total_events >= 1);
      assert.ok(impact.cohorts.by_7d);
      assert.ok(impact.cohorts.by_30d);
    });

    await t.test('last_active_at ignores session-only events', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const adminCookies = await makeAdmin(db, session);
      const parentRow = await db.query('SELECT id, family_id FROM parent WHERE email = $1', [session.email]);
      const { id: parentId, family_id: familyId } = parentRow.rows[0];

      await db.query('DELETE FROM analytics_events WHERE family_id = $1', [familyId]);
      await db.query(
        `INSERT INTO analytics_events (family_id, event_type, metadata, created_at)
         VALUES ($1, 'parent_session_started', $2, NOW())`,
        [
          familyId,
          JSON.stringify({
            actor_type: 'parent',
            actor_id: parentId,
            source: 'trusted_device_restore_parent',
            session_mode: 'resume',
            platform: 'web',
          }),
        ]
      );

      const res = await fetch(`${http.baseUrl}/api/admin/families-grouped`, {
        headers: { Cookie: cookieHeader(adminCookies) },
      });
      const families = await res.json();
      const family = families.find((f) => f.id === familyId);
      const parent = (family.parents || []).find((p) => p.id === parentId);
      assert.ok(parent.observability.last_session_started_at);
      assert.equal(parent.observability.last_active_at, null);
    });

    await t.test('active_days_30d unions analytics activity days and completion days', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const adminCookies = await makeAdmin(db, session);
      const parentRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
      const familyId = parentRow.rows[0].family_id;
      const childId = await createChild(http.baseUrl, session, { name: 'DaysUnion', emoji: '📅' });

      const base = new Date();
      for (const offset of [3, 2, 1]) {
        const d = new Date(base);
        d.setDate(d.getDate() - offset);
        await db.query(
          `INSERT INTO analytics_events (family_id, event_type, metadata, created_at)
           VALUES ($1, 'feature_child_view', $2, $3)`,
          [
            familyId,
            JSON.stringify({ actor_type: 'child', actor_id: childId }),
            d.toISOString(),
          ]
        );
      }

      const log = await db.query(
        `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
        [childId]
      );
      for (const offset of [5, 4]) {
        const d = new Date(base);
        d.setDate(d.getDate() - offset);
        await db.query(
          `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed, completed_at)
           VALUES ($1, $2, 'morgon', 0, 1, true, $3)`,
          [log.rows[0].id, `Task-${offset}`, d.toISOString()]
        );
      }

      const { fetchActiveDaysUnion } = require('../db/user-observability');
      const map = await fetchActiveDaysUnion([familyId]);
      const stats = map.get(`child:${childId}`);
      assert.ok(stats);
      assert.equal(stats.active_days_30d, 5, 'expected union of 3 analytics days + 2 completion days');

      const res = await fetch(`${http.baseUrl}/api/admin/families-grouped`, {
        headers: { Cookie: cookieHeader(adminCookies) },
      });
      const families = await res.json();
      const family = families.find((f) => f.id === familyId);
      const child = (family.children || []).find((c) => c.id === childId);
      assert.equal(child.observability.active_days_30d, 5);
    });

    await t.test('client analytics cannot spoof actor_id on authenticated event', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const parentRow = await db.query('SELECT id, family_id FROM parent WHERE email = $1', [session.email]);
      const { id: parentId, family_id: familyId } = parentRow.rows[0];
      const spoofed = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

      const eventRes = await fetch(`${http.baseUrl}/api/analytics/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({
          event_type: 'feature_daily_log',
          metadata: { actor_type: 'child', actor_id: spoofed },
        }),
      });
      assert.equal(eventRes.status, 204);

      await new Promise((r) => setTimeout(r, 100));
      const row = await db.query(
        `SELECT metadata FROM analytics_events
         WHERE family_id = $1 AND event_type = 'feature_daily_log'
         ORDER BY created_at DESC LIMIT 1`,
        [familyId]
      );
      assert.equal(row.rows[0].metadata.actor_id, parentId);
      assert.equal(row.rows[0].metadata.actor_type, 'parent');
    });

    await t.test('revoked trusted device appears with revoked status in families-grouped', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const adminCookies = await makeAdmin(db, session);
      const deviceCookies = await enrollParent(http, session, 'Revoke test');
      const hash = crypto.createHash('sha256').update(deviceCookies.trusted_device).digest('hex');
      await db.query(
        'UPDATE family_trusted_device SET revoked_at = NOW() WHERE token_hash = $1',
        [hash]
      );

      const res = await fetch(`${http.baseUrl}/api/admin/families-grouped`, {
        headers: { Cookie: cookieHeader(adminCookies) },
      });
      const families = await res.json();
      const family = families.find((f) =>
        (f.trusted_devices || []).some((d) => d.label === 'Revoke test')
      );
      assert.ok(family);
      const device = family.trusted_devices.find((d) => d.label === 'Revoke test');
      assert.equal(device.status, 'revoked');
    });
  } finally {
    delete process.env._TEST_BASE_URL;
    await http.close();
    await db.cleanup();
  }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
