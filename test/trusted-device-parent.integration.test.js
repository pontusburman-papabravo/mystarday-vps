'use strict';

/**
 * Fas 2C — parent trusted device enroll, restore, revocation, coherence.
 */

const crypto = require('crypto');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');
const { resolveAppEntry } = require('../src/lib/app-entry-resolve');

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
  assert.equal(body.device.device_mode, 'parent');
  assert.ok(!body.enroll_token, 'no raw token in JSON body');
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

function trustedOnly(cookies) {
  return cookies?.trusted_device ? { trusted_device: cookies.trusted_device } : cookies;
}

test('Fas 2C parent trusted device matrix', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableTrustedDeviceFlag(db);

    await t.test('A: enroll parent device', async () => {
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, { name: 'Kid', emoji: '⭐' });
      const cookies = await enrollParent(http, session);
      assert.ok(cookies.trusted_device);
    });

    await t.test('B+C: cold restore + second restore (force-close equivalent)', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const deviceCookies = await enrollParent(http, session);

      for (let i = 0; i < 2; i++) {
        const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookieHeader(trustedOnly(deviceCookies)),
          },
          body: JSON.stringify({}),
        });
        const restoreText = await restoreRes.text();
        assert.equal(restoreRes.status, 200, restoreText);
        const restoreBody = JSON.parse(restoreText);
        assert.equal(restoreBody.ok, true);
        assert.equal(restoreBody.user.type, 'parent');
        assert.equal(restoreBody.device_mode, 'parent');
        assert.equal(restoreBody.redirect, '/dashboard');

        let parentCookies = trustedOnly(deviceCookies);
        for (const header of getSetCookieHeaders(restoreRes)) {
          parentCookies = mergeCookies(parentCookies, [header]);
        }
        const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
          headers: { Cookie: cookieHeader(parentCookies) },
        });
        assert.equal(meRes.status, 200);
        const me = await meRes.json();
        assert.equal(me.type, 'parent');
      }
    });

    await t.test('D: revoked parent device cannot restore', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const deviceCookies = await enrollParent(http, session);
      const hash = crypto.createHash('sha256').update(deviceCookies.trusted_device).digest('hex');
      const row = await db.query(
        'SELECT id FROM family_trusted_device WHERE token_hash = $1',
        [hash]
      );
      const deviceId = row.rows[0].id;
      const revokeRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
      });
      assert.equal(revokeRes.status, 200);

      const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(trustedOnly(deviceCookies)),
        },
        body: JSON.stringify({}),
      });
      assert.equal(restoreRes.status, 401);
    });

    await t.test('E: removed family membership → restore denied', async () => {
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, { name: 'E1', emoji: '⭐' });
      const deviceCookies = await enrollParent(http, session);
      const me = await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      const parentId = (await me.json()).id;
      await db.query('DELETE FROM parent WHERE id = $1', [parentId]);

      const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(trustedOnly(deviceCookies)),
        },
        body: JSON.stringify({}),
      });
      assert.equal(restoreRes.status, 401);
    });

    await t.test('F: family mismatch on app-entry ignores device', async () => {
      const a = await registerAndLogin(http.baseUrl);
      const b = await registerAndLogin(http.baseUrl);
      const deviceCookies = await enrollParent(http, a);
      const meB = await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(b.cookies) },
      });
      const meBody = await meB.json();
      const { buildAppEntryInput } = require('../src/lib/build-app-entry-input');
      const req = {
        cookies: trustedOnly(deviceCookies),
        user: {
          type: 'parent',
          id: meBody.id,
          familyId: meBody.family_id || meBody.familyId,
        },
        query: {},
      };
      const input = await buildAppEntryInput(req, { cookie: () => {}, clearCookie: () => {} });
      assert.equal(input.trustedDevice.valid, false);
    });

    await t.test('G: stale local device mode hint does not override server parent device', () => {
      const r = resolveAppEntry({
        parentSession: null,
        childSession: null,
        trustedDevice: { valid: true, deviceMode: 'parent' },
        allowedChildren: [{ id: '00000000-0000-4000-8000-000000000001' }],
        localDeviceModeHint: 'child',
      });
      assert.equal(r.destination, 'parent-home');
      assert.equal(r.serverAction, 'restore-parent');
    });

    await t.test('H: shared device with one child restores child directly (parent is switch target)', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const childId = await createChild(http.baseUrl, session, { name: 'Only', emoji: '🦊' });
      const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ platform: 'web' }),
      });
      assert.equal(enrollRes.status, 201);
      let cookies = { ...session.cookies };
      for (const header of getSetCookieHeaders(enrollRes)) {
        cookies = mergeCookies(cookies, [header]);
      }
      const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(trustedOnly(cookies)) },
        body: JSON.stringify({}),
      });
      const body = JSON.parse(await restoreRes.text());
      assert.equal(restoreRes.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.user?.type, 'child');
      assert.equal(body.user?.id, childId);
    });

    await t.test('I: child device semantics unchanged', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const childId = await createChild(http.baseUrl, session, { name: 'Bound', emoji: '🌟' });
      const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/child`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ child_id: childId, platform: 'web' }),
      });
      assert.equal(enrollRes.status, 201);
      let cookies = { ...session.cookies };
      for (const header of getSetCookieHeaders(enrollRes)) {
        cookies = mergeCookies(cookies, [header]);
      }
      const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(trustedOnly(cookies)) },
        body: JSON.stringify({}),
      });
      const body = JSON.parse(await restoreRes.text());
      assert.equal(body.ok, true);
      assert.equal(body.user.id, childId);
    });

    await t.test('J: parent refresh rotation keeps trusted lineage', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const deviceCookies = await enrollParent(http, session);
      const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(trustedOnly(deviceCookies)),
        },
        body: JSON.stringify({}),
      });
      let cookies = trustedOnly(deviceCookies);
      for (const header of getSetCookieHeaders(restoreRes)) {
        cookies = mergeCookies(cookies, [header]);
      }
      const refresh1 = await fetch(`${http.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { Cookie: cookieHeader(cookies) },
      });
      assert.equal(refresh1.status, 200);
      let after1 = { ...cookies };
      for (const header of getSetCookieHeaders(refresh1)) {
        after1 = mergeCookies(after1, [header]);
      }
      const replayOld = await fetch(`${http.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { Cookie: cookieHeader(cookies) },
      });
      assert.equal(replayOld.status, 401, 'old refresh must not replay');
      const refresh3 = await fetch(`${http.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { Cookie: cookieHeader(after1) },
      });
      assert.equal(refresh3.status, 200);
    });

    await t.test('K: malformed trusted credential fail closed', async () => {
      const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'trusted_device=not-valid-hex',
        },
        body: JSON.stringify({}),
      });
      assert.equal(restoreRes.status, 401);
    });

    await t.test('L: revoke one adult device leaves other adult device valid', async () => {
      const primary = await registerAndLogin(http.baseUrl);
      const childId = await createChild(http.baseUrl, primary, { name: 'L1', emoji: '⭐' });
      const coparentEmail = `coparent-2c-${Date.now()}@example.com`;
      await fetch(`${http.baseUrl}/api/family/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(primary.cookies),
          'X-CSRF-Token': primary.csrfToken,
        },
        body: JSON.stringify({ name: 'Co', email: coparentEmail, child_ids: [childId] }),
      });
      const tokenRow = await db.query(
        `SELECT token FROM family_invite WHERE LOWER(email) = $1 ORDER BY created_at DESC LIMIT 1`,
        [coparentEmail.toLowerCase()]
      );
      await fetch(`${http.baseUrl}/api/family/invite/accept-new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenRow.rows[0].token, password: 'coparent-pass-12' }),
      });
      const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: coparentEmail, password: 'coparent-pass-12' }),
      });
      const coparentBody = JSON.parse(await loginRes.text());
      let coparentCookies = {};
      for (const header of getSetCookieHeaders(loginRes)) {
        coparentCookies = mergeCookies(coparentCookies, [header]);
      }
      const coparentSession = {
        cookies: coparentCookies,
        csrfToken: coparentBody.csrfToken,
        familyId: coparentBody.user?.familyId || coparentBody.familyId,
      };

      const primaryDevice = await enrollParent(http, primary, 'P phone');
      const coparentDevice = await enrollParent(http, coparentSession, 'Co phone');

      const hash = crypto.createHash('sha256').update(primaryDevice.trusted_device).digest('hex');
      const row = await db.query('SELECT id FROM family_trusted_device WHERE token_hash = $1', [hash]);
      await fetch(`${http.baseUrl}/api/family/trusted-devices/${row.rows[0].id}`, {
        method: 'DELETE',
        headers: {
          Cookie: cookieHeader(primary.cookies),
          'X-CSRF-Token': primary.csrfToken,
        },
      });

      const bad = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(trustedOnly(primaryDevice)),
        },
        body: JSON.stringify({}),
      });
      assert.equal(bad.status, 401);

      const good = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(trustedOnly(coparentDevice)),
        },
        body: JSON.stringify({}),
      });
      assert.equal(good.status, 200);
      const goodBody = JSON.parse(await good.text());
      assert.equal(goodBody.user.type, 'parent');
    });
  } finally {
    await http.close();
    await db.cleanup();
  }
});
