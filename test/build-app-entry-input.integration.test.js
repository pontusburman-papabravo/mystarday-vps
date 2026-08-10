'use strict';

/**
 * buildAppEntryInput — parent JWT on shared device must not imply active privilege.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY: TRUSTED_FLAG } = require('../src/lib/trusted-device-flags');
const { FLAG_KEY: ENTRY_FLAG } = require('../src/lib/family-device-entry-flags');
const { FLAG_KEY: DAILY_UX_FLAG } = require('../src/lib/family-device-daily-ux-flags');
const { resolveParentPrivilegeActive } = require('../src/lib/build-app-entry-input');
const { DESTINATIONS } = require('../src/lib/app-entry-resolve');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function enableEntryFlags(db) {
  for (const key of [TRUSTED_FLAG, ENTRY_FLAG, DAILY_UX_FLAG]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

test('resolveParentPrivilegeActive: parent JWT without escalation on shared device → false', () => {
  const user = { type: 'parent', id: 'p1' };
  const row = { device_mode: 'shared' };
  assert.equal(resolveParentPrivilegeActive(user, row), false);
});

test('resolveParentPrivilegeActive: parent device + parent JWT → true', () => {
  const user = { type: 'parent', id: 'p1' };
  const row = { device_mode: 'parent' };
  assert.equal(resolveParentPrivilegeActive(user, row), true);
});

test('app-entry: shared multi-child + parent JWT (no escalation) → profile-picker', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableEntryFlags(db);
    const parent = await registerAndLogin(http.baseUrl);
    await createChild(http.baseUrl, parent, { name: 'A', emoji: '🦊' });
    await createChild(http.baseUrl, parent, { name: 'B', emoji: '⭐' });
    await createChild(http.baseUrl, parent, { name: 'C', emoji: '🐻' });

    const setupRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/this-device/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parent.cookies),
        'X-CSRF-Token': parent.csrfToken,
      },
      body: JSON.stringify({
        usage: 'shared_with_children',
        platform: 'ios',
        start_mode: 'choose_child',
      }),
    });
    assert.equal(setupRes.status, 201);
    let cookies = { ...parent.cookies };
    for (const header of getSetCookieHeaders(setupRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const entryRes = await fetch(`${http.baseUrl}/api/auth/app-entry`, {
      headers: { Cookie: cookieHeader(cookies) },
    });
    assert.equal(entryRes.status, 200);
    const body = await entryRes.json();
    assert.equal(body.orchestratorActive, true);
    assert.equal(body.decision.destination, DESTINATIONS.PROFILE_PICKER);
    assert.equal(body.decision.viewContext, 'picker');
    assert.equal(body.decision.path, '/child/profile-picker');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
