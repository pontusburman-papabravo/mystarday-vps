'use strict';

/**
 * R4 freeze closure — member DELETE authz, orphan recovery, refresh/revoke race, completion burst.
 */

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');
const { FLAG_NATIVE } = require('../src/lib/widget-flags');
const config = require('../src/lib/config');

async function enableFlags(db) {
  for (const key of [FLAG_KEY, FLAG_NATIVE]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

async function inviteCoparent(http, dbConn, primary, childIds, emailPrefix = 'cop') {
  const email = `${emailPrefix}-${Date.now()}@example.com`;
  await fetch(`${http.baseUrl}/api/family/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(primary.cookies),
      'X-CSRF-Token': primary.csrfToken,
    },
    body: JSON.stringify({ name: 'Co', email, child_ids: childIds }),
  });
  const tokenRow = await dbConn.query(
    `SELECT token FROM family_invite WHERE LOWER(email) = $1 ORDER BY created_at DESC LIMIT 1`,
    [email.toLowerCase()]
  );
  await fetch(`${http.baseUrl}/api/family/invite/accept-new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenRow.rows[0].token, password: 'coparent-pass-12' }),
  });
  const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'coparent-pass-12' }),
  });
  const body = JSON.parse(await loginRes.text());
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { id: body.user?.id || body.id, email, cookies, csrfToken: body.csrfToken };
}

let db;

test('A1: member delete cannot orphan sole-admin child', async (t) => {
  db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  process.env.RATE_LIMIT_ENABLED = 'false';
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const primary = await registerAndLogin(http.baseUrl);
    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(primary.cookies) },
    });
    const me = await meRes.json();
    const familyId = me.family_id || me.familyId;
    const childB = await createChild(http.baseUrl, primary, { name: 'B', emoji: '🅱️' });
    const cop = await inviteCoparent(http, db, primary, [childB], 'sole-b');

    await db.query(
      `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $1
       WHERE parent_id = $2 AND child_id = $3`,
      [me.id, me.id, childB]
    );

    const del = await fetch(`${http.baseUrl}/api/family/members/${cop.id}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader(primary.cookies),
        'X-CSRF-Token': primary.csrfToken,
      },
    });
    assert.equal(del.status, 403, await del.text());

    const admins = await db.query(
      `SELECT parent_id FROM parent_child
       WHERE child_id = $1 AND revoked_at IS NULL AND role IN ('primary', 'shared')`,
      [childB]
    );
    assert.equal(admins.rows.length, 1);
    assert.equal(admins.rows[0].parent_id, cop.id);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('A2: cross-child primary cannot delete adult affecting unauthorized child', async (t) => {
  db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  process.env.RATE_LIMIT_ENABLED = 'false';
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const primary = await registerAndLogin(http.baseUrl);
    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(primary.cookies) },
    });
    const me = await meRes.json();
    const familyId = me.family_id || me.familyId;
    const childA = await createChild(http.baseUrl, primary, { name: 'A', emoji: '🅰️' });
    const childB = await createChild(http.baseUrl, primary, { name: 'B', emoji: '🅱️' });
    const cop = await inviteCoparent(http, db, primary, [childA, childB], 'cross-del');

    await db.query(
      `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $1
       WHERE parent_id = $2 AND child_id = $3`,
      [me.id, me.id, childB]
    );

    const del = await fetch(`${http.baseUrl}/api/family/members/${cop.id}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader(primary.cookies),
        'X-CSRF-Token': primary.csrfToken,
      },
    });
    assert.equal(del.status, 403, await del.text());
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('A3/A4: orphan recovery restricted to founding parent', async (t) => {
  db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  process.env.RATE_LIMIT_ENABLED = 'false';
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const primary = await registerAndLogin(http.baseUrl);
    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(primary.cookies) },
    });
    const me = await meRes.json();
    const familyId = me.family_id || me.familyId;
    const childB = await createChild(http.baseUrl, primary, { name: 'B', emoji: '🅱️' });
    const cop = await inviteCoparent(http, db, primary, [childB], 'orphan-rec');

    await db.query(
      `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $1 WHERE child_id = $2`,
      [me.id, childB]
    );

    const denied = await fetch(`${http.baseUrl}/api/family/children/${childB}/recover-admin`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(cop.cookies),
        'X-CSRF-Token': cop.csrfToken,
      },
    });
    assert.equal(denied.status, 403, await denied.text());

    const ok = await fetch(`${http.baseUrl}/api/family/children/${childB}/recover-admin`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(primary.cookies),
        'X-CSRF-Token': primary.csrfToken,
      },
    });
    assert.equal(ok.status, 200, await ok.text());

    const links = await db.query(
      `SELECT parent_id, role FROM parent_child WHERE child_id = $1 AND revoked_at IS NULL`,
      [childB]
    );
    assert.equal(links.rows.length, 1);
    assert.equal(links.rows[0].parent_id, me.id);
    assert.equal(links.rows[0].role, 'primary');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('A5: member delete disconnects target parent SSE', async (t) => {
  db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  process.env.RATE_LIMIT_ENABLED = 'false';
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const primary = await registerAndLogin(http.baseUrl);
    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(primary.cookies) },
    });
    const me = await meRes.json();
    const familyId = me.family_id || me.familyId;
    const childA = await createChild(http.baseUrl, primary, { name: 'A', emoji: '🅰️' });
    const cop = await inviteCoparent(http, db, primary, [childA], 'sse-del');

    const { addClient } = require('../src/lib/sse-broadcast');
    let ended = false;
    const res = {
      write() {},
      end() {
        ended = true;
      },
    };
    addClient(familyId, res, { parentId: cop.id, shouldDeliver: () => true });

    const del = await fetch(`${http.baseUrl}/api/family/members/${cop.id}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader(primary.cookies),
        'X-CSRF-Token': primary.csrfToken,
      },
    });
    assert.equal(del.status, 200, await del.text());
    assert.equal(ended, true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('T1: refresh vs device revoke race does not emit JWT without trustedDeviceId', async (t) => {
  db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  process.env.RATE_LIMIT_ENABLED = 'false';
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableFlags(db);
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session, { name: 'Race', emoji: '🏃' });
    for (let i = 0; i < 8; i++) {
      const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/child`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ child_id: childId, platform: 'web', label: `Race-${i}` }),
      });
      if (enrollRes.status !== 201) continue;
      let iterDeviceCookies = { ...session.cookies };
      for (const header of getSetCookieHeaders(enrollRes)) {
        iterDeviceCookies = mergeCookies(iterDeviceCookies, [header]);
      }

      const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader({ trusted_device: iterDeviceCookies.trusted_device }),
        },
      });
      if (restoreRes.status !== 200) continue;
      let childCookies = { trusted_device: iterDeviceCookies.trusted_device };
      for (const header of getSetCookieHeaders(restoreRes)) {
        childCookies = mergeCookies(childCookies, [header]);
      }

      const listRes = await fetch(`${http.baseUrl}/api/family/trusted-devices`, {
        headers: { Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken },
      });
      const devices = (await listRes.json()).devices || [];
      const deviceId = devices[devices.length - 1]?.id;
      if (!deviceId) continue;

      const [refreshRes] = await Promise.all([
        fetch(`${http.baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { Cookie: cookieHeader(childCookies) },
        }),
        fetch(`${http.baseUrl}/api/family/trusted-devices/${deviceId}`, {
          method: 'DELETE',
          headers: { Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken },
        }),
      ]);

      if (refreshRes.status === 200) {
        let nextCookies = { ...childCookies };
        for (const header of getSetCookieHeaders(refreshRes)) {
          nextCookies = mergeCookies(nextCookies, [header]);
        }
        const access = nextCookies.access_token;
        assert.ok(access, 'expected access cookie on successful refresh');
        const decoded = jwt.verify(access, config.jwt.secret);
        assert.ok(decoded.trustedDeviceId, 'trusted refresh must carry trustedDeviceId');
      }
    }
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('C1: rapid child completions do not 429 under integration profile', async (t) => {
  db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const primary = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, primary, { name: 'Burst', emoji: '⚡', pin: '2580' });
    const { hashPassword } = require('../src/lib/hash');
    const pinHash = await hashPassword('2580');
    await db.query(`UPDATE child SET username = 'burstchild', pin = $1 WHERE id = $2`, [pinHash, childId]);

    const log = await db.query(
      `INSERT INTO daily_log (child_id, date) VALUES ($1, (now() AT TIME ZONE 'Europe/Stockholm')::date) RETURNING id`,
      [childId]
    );
    const itemIds = [];
    for (let i = 0; i < 15; i++) {
      const itemRes = await db.query(
        `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
         VALUES ($1, $2, 'morgon', $3, 1, false) RETURNING id`,
        [log.rows[0].id, `Aktivitet ${i}`, i]
      );
      itemIds.push(itemRes.rows[0].id);
    }

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'burstchild', pin: '2580' }),
    });
    assert.equal(loginRes.status, 200, await loginRes.text());
    let childCookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }

    for (const itemId of itemIds) {
      const res = await fetch(`${http.baseUrl}/api/me/daily-log-items/${itemId}/complete`, {
        method: 'PUT',
        headers: { Cookie: cookieHeader(childCookies) },
      });
      assert.notEqual(res.status, 429, `completion should not 429 item ${itemId}`);
    }
  } finally {
    await http.close();
    await db.cleanup();
  }
});
