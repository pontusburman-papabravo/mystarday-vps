'use strict';

/**
 * R4.4 — adult invite child_ids, restricted co-parent access, revoke + trusted device scope.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
process.env.AUTHZ_HARDENING_ENABLED = 'true';
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

test('R4.4: invite with child_ids, restricted co-parent, revoke, shared device scope', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableTrustedDeviceFlag(db);
    const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
    const childA = await createChild(http.baseUrl, primary, { name: 'Barn A', emoji: '🅰️' });
    const childB = await createChild(http.baseUrl, primary, { name: 'Barn B', emoji: '🅱️' });

    const coparentEmail = `coparent-r44-${Date.now()}@example.com`;
    const inviteRes = await fetch(`${http.baseUrl}/api/family/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(primary.cookies),
        'X-CSRF-Token': primary.csrfToken,
      },
      body: JSON.stringify({
        name: 'Co Parent',
        email: coparentEmail,
        child_ids: [childA],
      }),
    });
    assert.equal(inviteRes.status, 201, await inviteRes.text());

    const tokenRow = await db.query(
      `SELECT token FROM family_invite WHERE LOWER(email) = $1 AND accepted = false ORDER BY created_at DESC LIMIT 1`,
      [coparentEmail.toLowerCase()]
    );
    assert.ok(tokenRow.rows[0]?.token);
    const token = tokenRow.rows[0].token;

    const acceptRes = await fetch(`${http.baseUrl}/api/family/invite/accept-new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: 'coparent-pass-12' }),
    });
    assert.equal(acceptRes.status, 201, await acceptRes.text());

    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: coparentEmail, password: 'coparent-pass-12' }),
    });
    const loginText = await loginRes.text();
    assert.equal(loginRes.status, 200, loginText);
    let coparentCookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      coparentCookies = mergeCookies(coparentCookies, [header]);
    }
    const loginBody = JSON.parse(loginText);
    const coparentCsrf = loginBody.csrfToken;

    const famRes = await fetch(`${http.baseUrl}/api/family`, {
      headers: { Cookie: cookieHeader(coparentCookies) },
    });
    const fam = JSON.parse(await famRes.text());
    assert.equal(famRes.status, 200);
    const visibleIds = fam.children.map((c) => c.id);
    assert.ok(visibleIds.includes(childA));
    assert.ok(!visibleIds.includes(childB), 'co-parent must not see Barn B on Hem');

    const deniedB = await fetch(
      `${http.baseUrl}/api/children/${childB}/daily-log?date=2026-06-01`,
      { headers: { Cookie: cookieHeader(coparentCookies) } }
    );
    assert.equal(deniedB.status, 403, await deniedB.text());

    const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(coparentCookies),
        'X-CSRF-Token': coparentCsrf,
      },
      body: JSON.stringify({ platform: 'web', label: 'Shared R44' }),
    });
    assert.equal(enrollRes.status, 201, await enrollRes.text());

    let deviceCookies = { ...coparentCookies };
    for (const header of getSetCookieHeaders(enrollRes)) {
      deviceCookies = mergeCookies(deviceCookies, [header]);
    }

    const ctxRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/context`, {
      method: 'GET',
      headers: { Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }) },
    });
    const ctx = JSON.parse(await ctxRes.text());
    assert.equal(ctxRes.status, 200, JSON.stringify(ctx));
    assert.equal(ctx.allowed_children.length, 1);
    assert.equal(ctx.allowed_children[0].id, childA);

    const selectDenied = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }),
      },
      body: JSON.stringify({ child_id: childB }),
    });
    assert.equal(selectDenied.status, 403, await selectDenied.text());

    const coparentParent = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
      coparentEmail.toLowerCase(),
    ]);
    const coparentId = coparentParent.rows[0].id;

    const revokeRes = await fetch(`${http.baseUrl}/api/family/members/${coparentId}/children`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(primary.cookies),
        'X-CSRF-Token': primary.csrfToken,
      },
      body: JSON.stringify({ childIds: [] }),
    });
    assert.equal(revokeRes.status, 400);

    await fetch(`${http.baseUrl}/api/family/members/${coparentId}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader(primary.cookies),
        'X-CSRF-Token': primary.csrfToken,
      },
    });

    const afterDelete = await fetch(`${http.baseUrl}/api/children/${childA}/daily-log?date=2026-06-01`, {
      headers: { Cookie: cookieHeader(coparentCookies) },
    });
    assert.ok(afterDelete.status === 401 || afterDelete.status === 403, await afterDelete.text());
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('R4.4: co-parent cannot invite for child they lack access to', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const passwordHash = await hashPassword('restricted-invite-1');
  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('R44', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;

  const primaryRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified, is_admin)
     VALUES ($1, $2, $3, 'Primary', true, true, true) RETURNING id`,
    [`primary-r44-${tag}@example.com`, passwordHash, familyId]
  );
  const sharedRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, $2, $3, 'Shared', true, true) RETURNING id`,
    [`shared-r44-${tag}@example.com`, passwordHash, familyId]
  );
  const childA = await db.query(
    `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'A', '⭐', $2) RETURNING id`,
    [familyId, `child-a-${tag}`]
  );
  const childB = await db.query(
    `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'B', '⭐', $2) RETURNING id`,
    [familyId, `child-b-${tag}`]
  );

  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary'), ($1, $3, 'primary'), ($4, $2, 'shared')`,
    [primaryRes.rows[0].id, childA.rows[0].id, childB.rows[0].id, sharedRes.rows[0].id]
  );

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `shared-r44-${tag}@example.com`,
        password: 'restricted-invite-1',
      }),
    });
    assert.equal(loginRes.status, 200);
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }
    const { csrfToken } = JSON.parse(await loginRes.text());

    const badInvite = await fetch(`${http.baseUrl}/api/family/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        name: 'Third',
        email: `third-r44-${tag}@example.com`,
        child_ids: [childB.rows[0].id],
      }),
    });
    assert.equal(badInvite.status, 403, await badInvite.text());
  } finally {
    await http.close();
    await db.cleanup();
  }
});
