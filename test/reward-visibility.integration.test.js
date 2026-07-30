'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

describe('reward visible_to_children', () => {
  test('null, empty array, and family-scoped IDs', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const email = `vis-${Date.now()}@example.com`;
    const password = 'vis-pass-1';
    const familyRes = await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('V', 'Europe/Stockholm', true) RETURNING id`
    );
    const familyId = familyRes.rows[0].id;
    const otherFamily = await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('O', 'Europe/Stockholm', true) RETURNING id`
    );
    await db.query(
      `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
       VALUES ($1, $2, $3, 'P', true, true)`,
      [email, await hashPassword(password), familyId]
    );
    const child = await db.query(
      `INSERT INTO child (family_id, name, username, emoji) VALUES ($1, 'C', 'c1', '⭐') RETURNING id`,
      [familyId]
    );
    const foreignChild = await db.query(
      `INSERT INTO child (family_id, name, username, emoji) VALUES ($1, 'X', 'x1', '⭐') RETURNING id`,
      [otherFamily.rows[0].id]
    );

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    let cookies = {};
    for (const h of getSetCookieHeaders(loginRes)) cookies = mergeCookies(cookies, [h]);
    const loginBody = JSON.parse(await loginRes.text());
    const headers = {
      Cookie: cookieHeader(cookies),
      'X-CSRF-Token': loginBody.csrfToken,
      'Content-Type': 'application/json',
    };

    try {
      const empty = await fetch(`${http.baseUrl}/api/rewards`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Hidden', star_cost: 1, visible_to_children: [] }),
      });
      assert.equal(empty.status, 201);
      const emptyBody = await empty.json();
      assert.deepEqual(emptyBody.visible_to_children, []);

      const foreign = await fetch(`${http.baseUrl}/api/rewards`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Filtered',
          star_cost: 1,
          visible_to_children: [foreignChild.rows[0].id, child.rows[0].id, child.rows[0].id],
        }),
      });
      assert.equal(foreign.status, 201);
      const foreignBody = await foreign.json();
      assert.deepEqual(foreignBody.visible_to_children, [child.rows[0].id]);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
