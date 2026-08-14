'use strict';

/**
 * SHARED_ONE_CHILD_SERVER regression — exact prod cold-start chain with
 * per-family overrides only (global Family Device flags remain OFF).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const {
  FAMILY_DEVICE_PILOT_FLAG_KEYS,
  WIDGET_PILOT_FLAG_KEYS,
} = require('../src/lib/family-device-pilot-guard');
const { enablePilotOverrides, countWidgetOverrides } = require('../scripts/ops/family-device-pilot-db.cjs');
const { createDisposableFamilyDeviceQaFamily } = require('../scripts/ops/family-device-qa-fixture.cjs');
const dbModule = require('../src/lib/db');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
process.env.FAMILY_DEVICE_PILOT_CONFIRM = '1';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const PILOT_TRUSTED_DEVICE_KEYS = FAMILY_DEVICE_PILOT_FLAG_KEYS.filter((k) => k !== 'adult_privilege_v1');

async function assertGlobalFlagsOff(db) {
  for (const key of [...FAMILY_DEVICE_PILOT_FLAG_KEYS, ...WIDGET_PILOT_FLAG_KEYS]) {
    const { rows } = await db.query('SELECT enabled FROM feature_flag WHERE key = $1', [key]);
    if (rows.length) {
      assert.equal(rows[0].enabled, false, `global ${key} must remain false`);
    }
  }
}

async function loginFixture(http, fixture) {
  const res = await fetch(`${http.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: fixture.email, password: fixture.password }),
  });
  const raw = await res.text();
  assert.equal(res.status, 200, raw);
  const body = JSON.parse(raw);
  let cookies = {};
  for (const header of getSetCookieHeaders(res)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { cookies, csrfToken: body.csrfToken };
}

async function enrollShared(http, session) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ platform: 'web', label: 'SHARED_ONE_CHILD regression' }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

function trustedOnlyCookies(cookies) {
  if (cookies && cookies.trusted_device) {
    return { trusted_device: cookies.trusted_device };
  }
  return cookies;
}

test('SHARED_ONE_CHILD: family overrides only, globals OFF, child-home + restore', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await assertGlobalFlagsOff(db);
    const fixture = await createDisposableFamilyDeviceQaFamily(dbModule, { childCount: 1 });
    await enablePilotOverrides(
      dbModule,
      fixture.familyId,
      fixture.email,
      'shared-one-child-regression',
      PILOT_TRUSTED_DEVICE_KEYS
    );
    await assertGlobalFlagsOff(db);
    assert.equal(await countWidgetOverrides(dbModule, fixture.familyId), 0);

    const session = await loginFixture(http, fixture);
    const childId = fixture.children[0].id;
    const deviceCookies = await enrollShared(http, session);
    const coldJar = trustedOnlyCookies(deviceCookies);

    const entryRes = await fetch(`${http.baseUrl}/api/auth/app-entry`, {
      headers: { Cookie: cookieHeader(coldJar) },
    });
    const entryBody = await entryRes.json();
    assert.equal(entryRes.status, 200);
    assert.equal(entryBody.orchestratorActive, true);
    assert.equal(entryBody.dailyUxActive, true);
    assert.equal(entryBody.decision.destination, 'child-home');
    assert.equal(entryBody.decision.serverAction, 'restore-child');
    assert.equal(entryBody.decision.childId, childId);
    assert.ok(Array.isArray(entryBody.allowedChildren) && entryBody.allowedChildren.length === 1);
    assert.ok(Array.isArray(entryBody.allowedParents) && entryBody.allowedParents.length >= 1);

    const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(coldJar) },
      body: JSON.stringify({}),
    });
    const restoreBody = await restoreRes.json();
    assert.equal(restoreRes.status, 200);
    assert.equal(restoreBody.ok, true);
    assert.equal(restoreBody.user?.type, 'child');
    assert.equal(restoreBody.user?.id, childId);

    let meCookies = { ...coldJar };
    for (const header of getSetCookieHeaders(restoreRes)) {
      meCookies = mergeCookies(meCookies, [header]);
    }
    const meBody = await (await fetch(`${http.baseUrl}/api/auth/me`, { headers: { Cookie: cookieHeader(meCookies) } })).json();
    assert.equal(meBody.type, 'child');
    assert.equal(meBody.id, childId);
    await assertGlobalFlagsOff(db);
    assert.equal(await countWidgetOverrides(dbModule, fixture.familyId), 0);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
