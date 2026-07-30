'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { listenApp } = require('./helpers/http.js');
const { setupTestDb } = require('./helpers/setup.js');
const { hashPassword } = require('../src/lib/hash');
const { cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'true';
process.env.API_AUTH_RATE_LIMIT_MAX = '3';
process.env.API_UNAUTH_RATE_LIMIT_MAX = '2';
process.env.EMAIL_ENABLED = 'false';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

describe('authenticated API rate limiting behavior', () => {
  test('same user gets 429 after budget; two users on same IP have separate buckets', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    delete require.cache[require.resolve('../src/middleware/rateLimiter')];
    delete require.cache[require.resolve('../src/lib/config')];
    delete require.cache[require.resolve('../app')];

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    const passwordHash = await hashPassword('rate-limit-pass-1');
    const familyRes = await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('RL', 'Europe/Stockholm', true) RETURNING id`
    );
    const familyId = familyRes.rows[0].id;

    const emailA = `rl-a-${Date.now()}@example.com`;
    const emailB = `rl-b-${Date.now()}@example.com`;
    await db.query(
      `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
       VALUES ($1, $2, $3, 'A', true, true), ($4, $2, $3, 'B', true, true)`,
      [emailA, passwordHash, familyId, emailB]
    );
    const parents = await db.query('SELECT id, email FROM parent WHERE email = ANY($1)', [[emailA, emailB]]);

    async function login(email) {
      const res = await fetch(`${http.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'rate-limit-pass-1' }),
      });
      let cookies = {};
      for (const h of getSetCookieHeaders(res)) cookies = mergeCookies(cookies, [h]);
      const body = JSON.parse(await res.text());
      return { cookies, csrf: body.csrfToken };
    }

    const userA = await login(emailA);
    const userB = await login(emailB);

  try {
      const path = '/api/rewards';
      let lastStatus = 200;
      for (let i = 0; i < 5; i++) {
        const res = await fetch(`${http.baseUrl}${path}`, {
          headers: {
            Cookie: cookieHeader(userA.cookies),
            'X-CSRF-Token': userA.csrf,
          },
        });
        lastStatus = res.status;
      }
      assert.equal(lastStatus, 429, 'user A should hit per-user limit');

      const resB = await fetch(`${http.baseUrl}${path}`, {
        headers: {
          Cookie: cookieHeader(userB.cookies),
          'X-CSRF-Token': userB.csrf,
        },
      });
      assert.equal(resB.status, 200, 'user B should not share user A bucket');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
