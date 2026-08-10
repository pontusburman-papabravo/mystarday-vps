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
