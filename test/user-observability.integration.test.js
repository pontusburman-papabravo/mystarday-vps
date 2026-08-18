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
