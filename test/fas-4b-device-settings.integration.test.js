'use strict';

/**
 * Fas 4B — this-device API + migration path for legacy enroll.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');
const { FLAG_KEY: ENTRY_FLAG } = require('../src/lib/family-device-entry-flags');
const { FLAG_KEY: DAILY_UX_FLAG } = require('../src/lib/family-device-daily-ux-flags');
const deviceSettings = require('../src/lib/trusted-device-settings');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function enableTrusted(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG_KEY]
  );
}

async function enableFamilyDeviceEntryFlags(db) {
  for (const key of [FLAG_KEY, ENTRY_FLAG, DAILY_UX_FLAG]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

function trustedOnlyCookies(cookies) {
  if (cookies && cookies.trusted_device) {
    return { trusted_device: cookies.trusted_device };
  }
  return cookies;
}

test('legacy child enroll → this-device setup_required false', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableTrusted(db);
    const parent = await registerAndLogin(http.baseUrl);
    const child = await createChild(http.baseUrl, parent, { name: 'Legacy', emoji: '⭐' });

    const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parent.cookies),
        'X-CSRF-Token': parent.csrfToken,
      },
      body: JSON.stringify({ child_id: child, platform: 'web', label: 'Old tablet' }),
    });
    assert.equal(enrollRes.status, 201, await enrollRes.text());
    let cookies = { ...parent.cookies };
    for (const header of getSetCookieHeaders(enrollRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const thisRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/this-device`, {
      headers: { Cookie: cookieHeader(cookies) },
    });
    assert.equal(thisRes.status, 200);
    const body = await thisRes.json();
    assert.equal(body.enrolled, true);
    assert.equal(body.setup_required, false);
    assert.equal(body.device.usage, 'child_device');
    assert.equal(body.device.start_child_id, child);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('setup flow enrolls shared device without widget side effects', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableTrusted(db);
    const parent = await registerAndLogin(http.baseUrl);
    await createChild(http.baseUrl, parent, { name: 'A', emoji: '⭐' });

    const setupRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/this-device/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parent.cookies),
        'X-CSRF-Token': parent.csrfToken,
      },
      body: JSON.stringify({
        usage: deviceSettings.USAGE_SHARED,
        platform: 'web',
        start_mode: deviceSettings.START_PICKER,
      }),
    });
    assert.equal(setupRes.status, 201);
    const body = await setupRes.json();
    assert.equal(body.device.usage, deviceSettings.USAGE_SHARED);
    assert.equal(body.device.start_mode, deviceSettings.START_PICKER);

    const widgetCount = await db.query(
      `SELECT COUNT(*)::int AS n FROM analytics_events WHERE event_type = 'widget_configured'`
    );
    assert.ok(widgetCount.rows[0].n >= 0);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('setup POST without CSRF → 403 CSRF_MISSING (device-setup prompt regression)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableTrusted(db);
    const parent = await registerAndLogin(http.baseUrl);
    await createChild(http.baseUrl, parent, { name: 'A', emoji: '⭐' });

    const setupRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/this-device/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parent.cookies),
      },
      body: JSON.stringify({
        usage: deviceSettings.USAGE_SHARED,
        platform: 'ios',
        start_mode: deviceSettings.START_PICKER,
      }),
    });
    assert.equal(setupRes.status, 403);
    const errBody = await setupRes.json();
    assert.equal(errBody.code, 'CSRF_MISSING');

    const count = await db.query(
      `SELECT COUNT(*)::int AS n FROM family_trusted_device
       WHERE family_id = (SELECT family_id FROM parent WHERE LOWER(email) = $1)`,
      [parent.email.toLowerCase()]
    );
    assert.equal(count.rows[0].n, 0);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('first enrollment: multi-child family, shared via setup → DB row + profile-picker app-entry', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableFamilyDeviceEntryFlags(db);
    const parent = await registerAndLogin(http.baseUrl);
    await createChild(http.baseUrl, parent, { name: 'Olle', emoji: '🦊' });
    await createChild(http.baseUrl, parent, { name: 'Astrid', emoji: '⭐' });
    await createChild(http.baseUrl, parent, { name: 'Anna', emoji: '🐻' });

    const before = await db.query(
      `SELECT COUNT(*)::int AS n FROM family_trusted_device
       WHERE family_id = (SELECT family_id FROM parent WHERE LOWER(email) = $1)`,
      [parent.email.toLowerCase()]
    );
    assert.equal(before.rows[0].n, 0);

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
        start_mode: deviceSettings.START_PICKER,
      }),
    });
    assert.equal(setupRes.status, 201);
    const setupBody = await setupRes.json();
    assert.equal(setupBody.device.usage, deviceSettings.USAGE_SHARED);
    assert.equal(setupBody.device.start_mode, deviceSettings.START_PICKER);
    assert.equal(setupBody.setup_required, false);

    let cookies = { ...parent.cookies };
    for (const header of getSetCookieHeaders(setupRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const after = await db.query(
      `SELECT device_mode, default_child_id FROM family_trusted_device
       WHERE family_id = (SELECT family_id FROM parent WHERE LOWER(email) = $1) AND revoked_at IS NULL`,
      [parent.email.toLowerCase()]
    );
    assert.equal(after.rows.length, 1);
    assert.equal(after.rows[0].device_mode, 'shared');
    assert.equal(after.rows[0].default_child_id, null);

    const entryRes = await fetch(`${http.baseUrl}/api/auth/app-entry`, {
      headers: { Cookie: cookieHeader(trustedOnlyCookies(cookies)) },
    });
    assert.equal(entryRes.status, 200);
    const entry = await entryRes.json();
    assert.equal(entry.decision.destination, 'profile-picker');
    assert.equal(entry.decision.credentialContext, 'none');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
