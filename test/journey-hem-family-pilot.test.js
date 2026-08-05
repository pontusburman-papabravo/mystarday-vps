'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const familyOverrides = require('../db/family-feature-overrides');
const { PILOT_OVERRIDE_KEY } = require('../src/lib/journey/family-pilot');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

test('family journey hem pilot enables context API when global OFF', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ('family_journey_context_api', false, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = false`
    );

    const session = await registerAndLogin(http.baseUrl);
    const famRes = await db.query(
      'SELECT family_id FROM parent WHERE email = $1',
      [session.email.toLowerCase()]
    );
    const familyId = famRes.rows[0].family_id;

    const blocked = await fetch(`${http.baseUrl}/api/me/journey-context`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    assert.equal(blocked.status, 503);

    await familyOverrides.upsertOverride(familyId, PILOT_OVERRIDE_KEY, true, {
      reason: 'test',
      source: 'test',
      createdBy: 'test',
    });

    const ok = await fetch(`${http.baseUrl}/api/me/journey-context`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const okText = await ok.text();
    assert.equal(ok.status, 200, okText);
    const body = JSON.parse(okText);
    assert.ok(body.capabilities);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
