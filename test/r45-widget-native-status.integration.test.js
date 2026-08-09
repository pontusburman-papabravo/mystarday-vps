'use strict';

/**
 * GET /api/widget/native-status — family widget flag for client promo gating.
 */

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const familyOverrides = require('../db/family-feature-overrides');
const overrideCache = require('../src/lib/activation-flag-family-cache');
const { FLAG_NATIVE } = require('../src/lib/widget-flags');

async function ensureFlagRow(db, key, enabled) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, $2, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [key, enabled]
  );
}

test('GET /api/widget/native-status reflects family override', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await ensureFlagRow(db, FLAG_NATIVE, false);
    const parent = await registerAndLogin(http.baseUrl);
    const famRes = await db.query('SELECT family_id FROM parent WHERE email = $1', [parent.email]);
    const familyId = famRes.rows[0].family_id;

    let res = await fetch(`${http.baseUrl}/api/widget/native-status`, {
      headers: { cookie: cookieHeader(parent.cookies) },
    });
    assert.equal(res.status, 200);
    let body = await res.json();
    assert.equal(body.native_widget_enabled, false);

    await familyOverrides.upsertOverride(familyId, FLAG_NATIVE, true, {
      reason: 'test',
      source: 'test',
      createdBy: 'test',
    });
    overrideCache.invalidateFamilyOverrideCache(familyId, FLAG_NATIVE);

    res = await fetch(`${http.baseUrl}/api/widget/native-status`, {
      headers: { cookie: cookieHeader(parent.cookies) },
    });
    assert.equal(res.status, 200);
    body = await res.json();
    assert.equal(body.native_widget_enabled, true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
