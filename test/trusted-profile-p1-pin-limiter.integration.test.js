'use strict';

/**
 * P1-1: select-parent must use parentPinLimiter (429 after budget).
 * Isolated file — RATE_LIMIT_ENABLED must be true before app module load.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');
const { FLAG_KEY: TRUSTED_FLAG } = require('../src/lib/trusted-device-flags');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'true';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function enableTrustedFlag(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [TRUSTED_FLAG]
  );
}

async function setupPinFamily(db, tag) {
  const passwordHash = await hashPassword(`pw-${tag}`);
  const pinHash = await hashPassword('4321');
  const email = `p1-rl-${tag}@example.com`;
  const familyId = (
    await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('RL', 'Europe/Stockholm', true) RETURNING id`
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
  return { parentId, email, password: `pw-${tag}` };
}

test('P1-1: select-parent parentPinLimiter returns 429 after wrong-PIN budget', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableTrustedFlag(db);
    const tag = Date.now();
    const fixture = await setupPinFamily(db, tag);

    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fixture.email, password: fixture.password }),
    });
    const loginText = await loginRes.text();
    assert.equal(loginRes.status, 200, loginText);
    let sessionCookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      sessionCookies = mergeCookies(sessionCookies, [header]);
    }
    const csrfToken = JSON.parse(loginText).csrfToken;

    const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(sessionCookies),
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ platform: 'web', label: 'PIN limiter test' }),
    });
    assert.equal(enrollRes.status, 201, await enrollRes.text());
    let deviceCookies = { ...sessionCookies };
    for (const header of getSetCookieHeaders(enrollRes)) {
      deviceCookies = mergeCookies(deviceCookies, [header]);
    }
    delete deviceCookies.access_token;
    delete deviceCookies.refresh_token;

    const statuses = [];
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-parent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }),
        },
        body: JSON.stringify({
          parent_id: fixture.parentId,
          unlock_method: 'pin',
          pin: '0000',
        }),
      });
      statuses.push(res.status);
    }

    assert.ok(statuses.includes(429), `expected 429 in ${JSON.stringify(statuses)}`);
    assert.ok(statuses.filter((s) => s === 401).length >= 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
