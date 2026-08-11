'use strict';

/**
 * Final security remediation — no spoofable biometric, no client launch_context authority.
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
const ADULT_PRIV_FLAG = 'adult_privilege_v1';
const ROOT = path.join(__dirname, '..');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function enableFlags(db) {
  for (const key of [TRUSTED_FLAG, ENTRY_FLAG, DAILY_UX_FLAG, ADULT_PRIV_FLAG]) {
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
    body: JSON.stringify({ platform: 'web', label: 'Final security shared' }),
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

async function setupPinFamily(db, tag, pin) {
  const passwordHash = await hashPassword(`pw-${tag}`);
  const pinHash = await hashPassword(pin || '4321');
  const email = `final-sec-${tag}@example.com`;
  const familyId = (
    await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('FS', 'Europe/Stockholm', true) RETURNING id`
    )
  ).rows[0].id;
  const parentId = (
    await db.query(
      `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified, parent_pin_hash)
       VALUES ($1,$2,$3,'Parent',true,true,$4) RETURNING id`,
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
  return { familyId, parentId, childId, email, password: `pw-${tag}`, pin: pin || '4321' };
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

async function setChildPin(db, childId) {
  const pinHash = await hashPassword('1234');
  await db.query('UPDATE child SET pin = $1 WHERE id = $2', [pinHash, childId]);
}

async function childLoginFromParent(http, parentSession, username) {
  const res = await fetch(`${http.baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(parentSession.cookies),
      'X-CSRF-Token': parentSession.csrfToken,
    },
    body: JSON.stringify({ username, pin: '1234' }),
  });
  assert.equal(res.status, 200, await res.text());
  let cookies = { ...parentSession.cookies };
  for (const header of getSetCookieHeaders(res)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

function cookiesHaveParentTokens(cookies) {
  return Boolean(cookies.access_token || cookies.refresh_token);
}

test('final security remediation matrix', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableFlags(db);

    await t.test('SECURITY: biometric string on select-parent denied', async () => {
      const tag = `bio-deny-${Date.now()}`;
      const fixture = await setupPinFamily(db, tag);
      const session = await loginByEmail(http.baseUrl, fixture.email, fixture.password);
      const deviceCookies = await enrollShared(http, session);

      const res = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-parent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(trustedOnly(deviceCookies)),
        },
        body: JSON.stringify({
          parent_id: fixture.parentId,
          unlock_method: 'biometric',
        }),
      });
      const body = await res.json();
      assert.ok(res.status >= 400, JSON.stringify(body));
      assert.ok(
        body.code === 'ADULT_VERIFICATION_REQUIRED' || body.code === 'PARENT_PIN_INVALID',
        body.code
      );
      assert.ok(!cookiesHaveParentTokens(getSetCookieHeaders(res).length ? {} : {}));
      const setHeaders = getSetCookieHeaders(res);
      let outCookies = { ...trustedOnly(deviceCookies) };
      for (const h of setHeaders) outCookies = mergeCookies(outCookies, [h]);
      assert.ok(!outCookies.access_token, 'must not issue parent access_token');
      const me = await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(trustedOnly(deviceCookies)) },
      });
      assert.notEqual((await me.json()).type, 'parent');
    });

    await t.test('SECURITY: missing unlock_method on select-parent denied', async () => {
      const tag = `no-method-${Date.now()}`;
      const fixture = await setupPinFamily(db, tag);
      const session = await loginByEmail(http.baseUrl, fixture.email, fixture.password);
      const deviceCookies = await enrollShared(http, session);
      const res = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-parent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(trustedOnly(deviceCookies)),
        },
        body: JSON.stringify({ parent_id: fixture.parentId }),
      });
      assert.ok(res.status >= 400);
    });

    await t.test('SECURITY: correct PIN on select-parent grants parent authority', async () => {
      const tag = `pin-ok-${Date.now()}`;
      const fixture = await setupPinFamily(db, tag);
      const session = await loginByEmail(http.baseUrl, fixture.email, fixture.password);
      const deviceCookies = await enrollShared(http, session);
      const res = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-parent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(trustedOnly(deviceCookies)),
        },
        body: JSON.stringify({
          parent_id: fixture.parentId,
          unlock_method: 'pin',
          pin: fixture.pin,
        }),
      });
      assert.equal(res.status, 200, await res.text());
      let cookies = trustedOnly(deviceCookies);
      for (const h of getSetCookieHeaders(res)) cookies = mergeCookies(cookies, [h]);
      const me = await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(cookies) },
      });
      assert.equal((await me.json()).type, 'parent');
    });

    await t.test('SECURITY: no family PIN → ADULT_PIN_SETUP_REQUIRED', async () => {
      const primary = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, primary, { name: 'Kid', emoji: '⭐' });
      const deviceCookies = await enrollShared(http, primary);
      const parentRow = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
        primary.email.toLowerCase(),
      ]);
      const res = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-parent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(trustedOnly(deviceCookies)),
        },
        body: JSON.stringify({
          parent_id: parentRow.rows[0].id,
          unlock_method: 'pin',
          pin: '4321',
        }),
      });
      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.code, 'ADULT_PIN_SETUP_REQUIRED');
    });

    await t.test('ENTRY: multi-profile + child JWT → picker (no query bypass)', async () => {
      const primary = await registerAndLogin(http.baseUrl);
      const ca = await createChild(http.baseUrl, primary, { name: 'CA', emoji: 'A' });
      await createChild(http.baseUrl, primary, { name: 'CB', emoji: 'B' });
      await setChildPin(db, ca);
      const uA = (await db.query('SELECT username FROM child WHERE id = $1', [ca])).rows[0].username;
      const deviceCookies = await enrollShared(http, primary);
      const childCookies = await childLoginFromParent(http, { ...primary, cookies: deviceCookies }, uA);

      const plain = await fetchAppEntry(http.baseUrl, childCookies);
      assert.equal(plain.body.decision.destination, 'profile-picker');

      const spoof = await fetchAppEntry(
        http.baseUrl,
        childCookies,
        'launch_context=foreground_resume'
      );
      assert.equal(spoof.body.decision.destination, 'profile-picker');

      const spoof2 = await fetchAppEntry(http.baseUrl, childCookies, 'launch_context=anything');
      assert.equal(spoof2.body.decision.destination, 'profile-picker');
      assert.equal(spoof2.body.launchContext, undefined);
    });

    await t.test('ENTRY: multi-profile + adult lease JWT → picker', async () => {
      const tag = `lease-${Date.now()}`;
      const fixture = await setupPinFamily(db, tag);
      const session = await loginByEmail(http.baseUrl, fixture.email, fixture.password);
      const childB = await createChild(http.baseUrl, session, { name: 'B2', emoji: 'B' });
      const deviceCookies = await enrollShared(http, session);

      const parentRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-parent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(trustedOnly(deviceCookies)),
        },
        body: JSON.stringify({
          parent_id: fixture.parentId,
          unlock_method: 'pin',
          pin: fixture.pin,
        }),
      });
      assert.equal(parentRes.status, 200);
      let parentCookies = trustedOnly(deviceCookies);
      for (const h of getSetCookieHeaders(parentRes)) parentCookies = mergeCookies(parentCookies, [h]);

      const { body } = await fetchAppEntry(http.baseUrl, parentCookies);
      assert.equal(body.decision.destination, 'profile-picker');
      void childB;
    });

    await t.test('SECURITY: adult-privilege biometric string denied', async () => {
      const tag = `ap-bio-${Date.now()}`;
      const fixture = await setupPinFamily(db, tag);
      const session = await loginByEmail(http.baseUrl, fixture.email, fixture.password);
      const username = (
        await db.query('SELECT username FROM child WHERE id = $1', [fixture.childId])
      ).rows[0].username;
      const clRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ username, pin: '1112' }),
      });
      const clText = await clRes.text();
      assert.equal(clRes.status, 200, clText);
      const clBody = JSON.parse(clText);
      let childCookies = { ...session.cookies };
      for (const h of getSetCookieHeaders(clRes)) childCookies = mergeCookies(childCookies, [h]);

      const unlockRes = await fetch(`${http.baseUrl}/api/family/adult-privilege/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(childCookies),
          'X-CSRF-Token': clBody.csrfToken,
        },
        body: JSON.stringify({ unlockMethod: 'biometric' }),
      });
      const unlockBody = await unlockRes.json();
      assert.equal(unlockRes.status, 401);
      assert.equal(unlockBody.code, 'ADULT_VERIFICATION_REQUIRED');
    });

    await t.test('CLIENT: orchestrator does not send launch_context query', () => {
      const src = fs.readFileSync(path.join(ROOT, 'public/js/app-entry-orchestrator.js'), 'utf8');
      assert.doesNotMatch(src, /launch_context/);
    });

    await t.test('CLIENT: child-login skips app-entry when decision already applied', () => {
      const src = fs.readFileSync(path.join(ROOT, 'public/js/child-login.js'), 'utf8');
      assert.match(src, /isDecisionApplied/);
      assert.match(src, /if \(AppEntryOrchestrator\.isDecisionApplied && AppEntryOrchestrator\.isDecisionApplied\(\)\)/);
    });

    await t.test('CLIENT: adult-privilege does not post biometric unlock_method', () => {
      const src = fs.readFileSync(path.join(ROOT, 'public/js/adult-privilege.js'), 'utf8');
      assert.doesNotMatch(src, /unlock_method:\s*['"]biometric['"]/);
      assert.doesNotMatch(src, /unlockMethod:\s*['"]biometric['"]/);
      assert.doesNotMatch(src, /postUnlock\(['"]biometric/);
    });
  } finally {
    await http.close();
    await db.cleanup();
  }
});
