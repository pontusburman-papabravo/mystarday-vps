'use strict';

/**
 * P1 remediation security matrix for Netflix-style trusted profile picker.
 */

const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { FLAG_KEY: TRUSTED_FLAG } = require('../src/lib/trusted-device-flags');
const { FLAG_KEY: ENTRY_FLAG } = require('../src/lib/family-device-entry-flags');
const { FLAG_KEY: DAILY_UX_FLAG } = require('../src/lib/family-device-daily-ux-flags');
const { listParentsForSharedDevice } = require('../src/lib/trusted-device');

const ROOT = path.join(__dirname, '..');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const ADULT_FLAG = 'adult_privilege_v1';

async function enableFlags(db) {
  for (const key of [TRUSTED_FLAG, ENTRY_FLAG, DAILY_UX_FLAG, ADULT_FLAG]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

async function enrollShared(http, session) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ platform: 'web', label: 'P1 remediation shared' }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  delete cookies.access_token;
  delete cookies.refresh_token;
  return cookies;
}

function trustedOnly(cookies) {
  return cookies?.trusted_device ? { trusted_device: cookies.trusted_device } : cookies;
}

async function fetchAppEntry(baseUrl, cookies, query) {
  const q = query ? `?${query}` : '';
  const res = await fetch(`${baseUrl}/api/auth/app-entry${q}`, {
    headers: { Cookie: cookieHeader(cookies) },
  });
  return { status: res.status, body: await res.json() };
}

async function postSelectParent(baseUrl, deviceCookies, parentId, body) {
  return fetch(`${baseUrl}/api/auth/trusted-device/select-parent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(trustedOnly(deviceCookies)),
    },
    body: JSON.stringify({ parent_id: parentId, ...body }),
  });
}

async function setupPinParent(db, tag) {
  const passwordHash = await hashPassword(`pw-${tag}`);
  const pinHash = await hashPassword('4321');
  const email = `p1-pin-${tag}@example.com`;
  const familyId = (
    await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('P1', 'Europe/Stockholm', true) RETURNING id`
    )
  ).rows[0].id;
  const parentId = (
    await db.query(
      `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified, parent_pin_hash)
       VALUES ($1,$2,$3,'Pin Parent',true,true,$4) RETURNING id`,
      [email, passwordHash, familyId, pinHash]
    )
  ).rows[0].id;
  const childId = (
    await db.query(
      `INSERT INTO child (family_id, name, emoji, username, pin) VALUES ($1,'Kid','⭐',$2,$3) RETURNING id`,
      [familyId, `kid-${tag}`, await hashPassword('1112')]
    )
  ).rows[0].id;
  await db.query(`INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1,$2,'primary')`, [
    parentId,
    childId,
  ]);
  return { familyId, parentId, childId, email, password: `pw-${tag}` };
}

async function loginByEmail(baseUrl, email, password) {
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
  return { cookies, csrfToken: JSON.parse(text).csrfToken, email };
}

test('P1 remediation: trusted profile picker security matrix', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableFlags(db);

    await t.test('P1-1: wrong parent PIN rejected on select-parent', async () => {
      const tag = `wrong-pin-${Date.now()}`;
      const fixture = await setupPinParent(db, tag);
      const session = await loginByEmail(http.baseUrl, fixture.email, fixture.password);
      const deviceCookies = await enrollShared(http, session);

      const res = await postSelectParent(http.baseUrl, deviceCookies, fixture.parentId, {
        unlock_method: 'pin',
        pin: '9999',
      });
      const body = await res.json();
      assert.equal(res.status, 401, JSON.stringify(body));
      assert.equal(body.code, 'PARENT_PIN_INVALID');
    });

    await t.test('P1-2: cross-family parent_id denied', async () => {
      const primary = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, primary, { name: 'A', emoji: 'A' });
      const deviceCookies = await enrollShared(http, primary);

      const other = await registerAndLogin(http.baseUrl);
      const otherParent = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
        other.email.toLowerCase(),
      ]);

      const res = await postSelectParent(http.baseUrl, deviceCookies, otherParent.rows[0].id, {
        unlock_method: 'biometric',
      });
      const body = await res.json();
      assert.equal(res.status, 403, JSON.stringify(body));
      assert.equal(body.code, 'PARENT_ACCESS_DENIED');
    });

    await t.test('P1-2b: revoked co-parent excluded from allowedParents', async () => {
      const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
      const childA = await createChild(http.baseUrl, primary, { name: 'Barn', emoji: '⭐' });
      const coparentEmail = `coparent-p1-${Date.now()}@example.com`;

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
      const acceptRes = await fetch(`${http.baseUrl}/api/family/invite/accept-new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenRow.rows[0].token, password: 'coparent-pass-12' }),
      });
      assert.equal(acceptRes.status, 201, await acceptRes.text());

      const famRow = await db.query('SELECT family_id FROM parent WHERE LOWER(email) = $1', [
        primary.email.toLowerCase(),
      ]);
      const familyId = famRow.rows[0].family_id;
      const coparentRow = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
        coparentEmail.toLowerCase(),
      ]);
      const coparentId = coparentRow.rows[0].id;

      const beforeParents = await listParentsForSharedDevice(familyId);
      assert.ok(beforeParents.some((p) => p.id === coparentId));

      const deviceCookies = await enrollShared(http, primary);
      const { body: entryBefore } = await fetchAppEntry(http.baseUrl, trustedOnly(deviceCookies));
      const parentIdsBefore = (entryBefore.allowedParents || []).map((p) => p.id);
      assert.ok(parentIdsBefore.includes(coparentId));

      await fetch(`${http.baseUrl}/api/family/members/${coparentId}`, {
        method: 'DELETE',
        headers: {
          Cookie: cookieHeader(primary.cookies),
          'X-CSRF-Token': primary.csrfToken,
        },
      });

      const afterParents = await listParentsForSharedDevice(familyId);
      assert.ok(!afterParents.some((p) => p.id === coparentId));

      const denied = await postSelectParent(http.baseUrl, deviceCookies, coparentId, {
        unlock_method: 'biometric',
      });
      const deniedBody = await denied.json();
      assert.equal(denied.status, 403, JSON.stringify(deniedBody));
      assert.equal(deniedBody.code, 'PARENT_ACCESS_DENIED');
    });

    await t.test('P1-2c: pedagog-only parent excluded from picker', async () => {
      const tag = `pedagog-${Date.now()}`;
      const passwordHash = await hashPassword(`pw-${tag}`);
      const familyId = (
        await db.query(
          `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Ped', 'Europe/Stockholm', true) RETURNING id`
        )
      ).rows[0].id;
      const primaryId = (
        await db.query(
          `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
           VALUES ($1,$2,$3,'Primary',true,true) RETURNING id`,
          [`primary-${tag}@example.com`, passwordHash, familyId]
        )
      ).rows[0].id;
      const pedagogId = (
        await db.query(
          `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified, account_type)
           VALUES ($1,$2,$3,'Pedagog',true,true,'educator') RETURNING id`,
          [`pedagog-${tag}@example.com`, passwordHash, familyId]
        )
      ).rows[0].id;
      const childId = (
        await db.query(
          `INSERT INTO child (family_id, name, emoji, username, pin) VALUES ($1,'Kid','⭐',$2,$3) RETURNING id`,
          [familyId, `kid-${tag}`, await hashPassword('1112')]
        )
      ).rows[0].id;
      await db.query(
        `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1,$2,'primary'),($3,$2,'pedagog')`,
        [primaryId, childId, pedagogId]
      );

      const parents = await listParentsForSharedDevice(familyId);
      assert.equal(parents.length, 1);
      assert.equal(parents[0].id, primaryId);

      const session = await loginByEmail(http.baseUrl, `primary-${tag}@example.com`, `pw-${tag}`);
      const deviceCookies = await enrollShared(http, session);
      const denied = await postSelectParent(http.baseUrl, deviceCookies, pedagogId, {
        unlock_method: 'biometric',
      });
      const body = await denied.json();
      assert.equal(denied.status, 403, JSON.stringify(body));
      assert.equal(body.code, 'PARENT_ACCESS_DENIED');
    });

    await t.test('P1-5: no unlock_method fail-closed without family PIN', async () => {
      const primary = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, primary, { name: 'Kid', emoji: '⭐' });
      const deviceCookies = await enrollShared(http, primary);
      const parentRow = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
        primary.email.toLowerCase(),
      ]);

      const res = await postSelectParent(http.baseUrl, deviceCookies, parentRow.rows[0].id, {});
      const body = await res.json();
      assert.equal(res.status, 403, JSON.stringify(body));
      assert.equal(body.code, 'ADULT_PIN_SETUP_REQUIRED');
    });

    await t.test('P1-5b: family PIN requires unlock_method', async () => {
      const tag = `verify-req-${Date.now()}`;
      const fixture = await setupPinParent(db, tag);
      const session = await loginByEmail(http.baseUrl, fixture.email, fixture.password);
      const deviceCookies = await enrollShared(http, session);

      const res = await postSelectParent(http.baseUrl, deviceCookies, fixture.parentId, {});
      const body = await res.json();
      assert.equal(res.status, 401, JSON.stringify(body));
      assert.equal(body.code, 'ADULT_VERIFICATION_REQUIRED');
    });

    await t.test('P1-5c: biometric unlock succeeds when no family PIN', async () => {
      const primary = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, primary, { name: 'Kid', emoji: '⭐' });
      const deviceCookies = await enrollShared(http, primary);
      const parentRow = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
        primary.email.toLowerCase(),
      ]);

      const res = await postSelectParent(http.baseUrl, deviceCookies, parentRow.rows[0].id, {
        unlock_method: 'biometric',
      });
      assert.equal(res.status, 200, await res.text());
    });

    await t.test('P1-3/P1-4: multi-profile cold restore forces picker (no last_active bypass)', async () => {
      const primary = await registerAndLogin(http.baseUrl);
      const childA = await createChild(http.baseUrl, primary, { name: 'CA', emoji: 'A' });
      const childB = await createChild(http.baseUrl, primary, { name: 'CB', emoji: 'B' });
      const deviceCookies = await enrollShared(http, primary);

      const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childA]);
      await db.query(
        `UPDATE family_trusted_device SET last_active_child_id = $1 WHERE family_id = $2 AND revoked_at IS NULL`,
        [childB, fam.rows[0].family_id]
      );

      const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(trustedOnly(deviceCookies)),
        },
        body: JSON.stringify({}),
      });
      const restoreBody = await restoreRes.json();
      assert.equal(restoreRes.status, 200, JSON.stringify(restoreBody));
      assert.equal(restoreBody.ok, false);
      assert.equal(restoreBody.code, 'SHARED_PICKER_REQUIRED');

      const { body: entryBody } = await fetchAppEntry(
        http.baseUrl,
        trustedOnly(deviceCookies),
        'launch_context=cold_start'
      );
      assert.equal(entryBody.decision.destination, 'profile-picker');
      assert.equal(entryBody.launchContext, 'cold_start');
    });

    await t.test('adult→child lockdown: select-child clears parent privilege', async () => {
      const primary = await registerAndLogin(http.baseUrl);
      const childA = await createChild(http.baseUrl, primary, { name: 'Lock', emoji: '🔒' });
      const deviceCookies = await enrollShared(http, primary);
      const parentRow = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
        primary.email.toLowerCase(),
      ]);

      const parentRes = await postSelectParent(http.baseUrl, deviceCookies, parentRow.rows[0].id, {
        unlock_method: 'biometric',
      });
      assert.equal(parentRes.status, 200, await parentRes.text());
      let cookies = trustedOnly(deviceCookies);
      for (const header of getSetCookieHeaders(parentRes)) {
        cookies = mergeCookies(cookies, [header]);
      }

      const meParent = await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(cookies) },
      });
      assert.equal((await meParent.json()).type, 'parent');

      const childRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-child`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(cookies),
        },
        body: JSON.stringify({ child_id: childA }),
      });
      assert.equal(childRes.status, 200, await childRes.text());
      for (const header of getSetCookieHeaders(childRes)) {
        cookies = mergeCookies(cookies, [header]);
      }

      const meChild = await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(cookies) },
      });
      const meBody = await meChild.json();
      assert.equal(meBody.type, 'child');

      const statusRes = await fetch(`${http.baseUrl}/api/family/adult-privilege/status`, {
        headers: { Cookie: cookieHeader(cookies) },
      });
      const statusBody = await statusRes.json();
      assert.equal(statusRes.status, 200);
      assert.equal(statusBody.privilegeActive, false);
      assert.equal(statusBody.handoffAvailable, true);
    });

    await t.test('widget independence: bootstrap must not sync widget binding on profile apply', () => {
      const boot = fs.readFileSync(path.join(ROOT, 'public/js/trusted-device-bootstrap.js'), 'utf8');
      assert.doesNotMatch(boot, /syncBinding/);
    });
  } finally {
    await http.close();
    await db.cleanup();
  }
});
