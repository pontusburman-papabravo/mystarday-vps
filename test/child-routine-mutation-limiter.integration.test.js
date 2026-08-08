'use strict';

/**
 * Child routine mutation limiter — real HTTP with RATE_LIMIT_ENABLED=true.
 */

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { getStarBalance } = require('../src/routes/rewards');

function bustAppModules() {
  delete require.cache[require.resolve('../src/lib/config')];
  delete require.cache[require.resolve('../src/middleware/rateLimiter')];
  delete require.cache[require.resolve('../app')];
}

async function childLogin(http, username, pin) {
  const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
  const loginText = await loginRes.text();
  assert.equal(loginRes.status, 200, loginText);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  const body = JSON.parse(loginText);
  return { cookies, csrfToken: body.csrfToken };
}

async function setupChildWithItems(db, http, itemCount = 20) {
  const primary = await registerAndLogin(http.baseUrl);
  const childId = await createChild(http.baseUrl, primary, { name: 'Limiter', emoji: '⚡' });
  const pinHash = await hashPassword('2580');
  const username = `limchild${Date.now().toString(36).slice(-6)}`;
  await db.query(`UPDATE child SET username = $1, pin = $2 WHERE id = $3`, [username, pinHash, childId]);

  const log = await db.query(
    `INSERT INTO daily_log (child_id, date) VALUES ($1, (now() AT TIME ZONE 'Europe/Stockholm')::date) RETURNING id`,
    [childId]
  );
  const itemIds = [];
  for (let i = 0; i < itemCount; i++) {
    const itemRes = await db.query(
      `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
       VALUES ($1, $2, 'morgon', $3, 1, false) RETURNING id`,
      [log.rows[0].id, `Akt ${i}`, i]
    );
    itemIds.push(itemRes.rows[0].id);
  }

  const child = await childLogin(http, username, '2580');
  return { childId, itemIds, child };
}

async function completeItem(http, child, itemId) {
  return fetch(`${http.baseUrl}/api/me/daily-log-items/${itemId}/complete`, {
    method: 'PUT',
    headers: {
      Cookie: cookieHeader(child.cookies),
      'X-CSRF-Token': child.csrfToken,
    },
  });
}

async function uncompleteItem(http, child, itemId) {
  return fetch(`${http.baseUrl}/api/me/daily-log-items/${itemId}/uncomplete`, {
    method: 'PUT',
    headers: {
      Cookie: cookieHeader(child.cookies),
      'X-CSRF-Token': child.csrfToken,
    },
  });
}

describe('child routine mutation limiter (enabled)', () => {
  test('20 rapid distinct completions succeed with limiter enabled', async (t) => {
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.CHILD_ROUTINE_MUTATION_MAX_PER_MIN = '300';
    process.env.API_AUTH_RATE_LIMIT_MAX = '500';
    bustAppModules();

    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const { childId, itemIds, child } = await setupChildWithItems(db, http, 20);
      const starsBefore = await getStarBalance(childId);

      let completed = 0;
      for (const itemId of itemIds) {
        const res = await completeItem(http, child, itemId);
        assert.notEqual(res.status, 429, `item ${itemId} should not 429`);
        assert.equal(res.status, 200, await res.text());
        completed += 1;
      }
      assert.equal(completed, 20);

      const starsAfter = await getStarBalance(childId);
      assert.equal(starsAfter - starsBefore, 20, 'one star per first-time completion');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('toggle loop on one item eventually returns 429 with Retry-After', async (t) => {
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.CHILD_ROUTINE_MUTATION_MAX_PER_MIN = '8';
    process.env.API_AUTH_RATE_LIMIT_MAX = '500';
    bustAppModules();

    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const { itemIds, child } = await setupChildWithItems(db, http, 1);
      const itemId = itemIds[0];
      let saw429 = false;
      for (let i = 0; i < 30; i++) {
        const res = i % 2 === 0
          ? await completeItem(http, child, itemId)
          : await uncompleteItem(http, child, itemId);
        if (res.status === 429) {
          saw429 = true;
          assert.ok(res.headers.get('retry-after'), 'Retry-After header expected');
          const body = JSON.parse(await res.text());
          assert.match(body.error || '', /lite fort/i);
          break;
        }
        assert.ok([200, 409].includes(res.status), `unexpected ${res.status}`);
      }
      assert.equal(saw429, true, 'dedicated limiter should block abusive toggle loop');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('child read routes remain bounded by apiLimiter', async (t) => {
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.CHILD_ROUTINE_MUTATION_MAX_PER_MIN = '300';
    process.env.API_AUTH_RATE_LIMIT_MAX = '3';
    bustAppModules();

    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const { child } = await setupChildWithItems(db, http, 1);
      let lastStatus = 200;
      for (let i = 0; i < 6; i++) {
        const res = await fetch(`${http.baseUrl}/api/me/goal`, {
          headers: {
            Cookie: cookieHeader(child.cookies),
            'X-CSRF-Token': child.csrfToken,
          },
        });
        lastStatus = res.status;
      }
      assert.equal(lastStatus, 429, 'read API should still hit apiLimiter');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
