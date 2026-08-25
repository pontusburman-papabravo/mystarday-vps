'use strict';

/**
 * P1 — dashboard/settings read-burst rate limit fix.
 *
 * Root cause (2026-08-25 physical QA incident): a single /dashboard page load
 * fires 20-30 parallel authenticated GETs (family, children, for-dig/*, etc.).
 * 2-3 reloads within 60s (repeated child<->parent profile switching) exhausted
 * the single shared apiLimiter bucket (100 req/min per parent), causing
 * mass-429 on "Kunde inte ladda förfrågningar" / "Kunde inte ladda mål" /
 * "Familjeinformation kunde inte laddas just nu".
 *
 * Fix: known read-heavy dashboard/settings bootstrap GET paths now consume a
 * separate, higher-ceiling apiReadLimiter bucket (parent-read:<id>) instead of
 * the standard apiLimiter bucket. Mutations and all other traffic are unaffected.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { hashPassword } = require('../src/lib/hash');
const { cookieHeader, getSetCookieHeaders, mergeCookies, listenApp } = require('./helpers/http.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'true';
// Deliberately tiny standard bucket so a leak into it would be immediately visible,
// and a read bucket large enough to absorb a realistic 3x dashboard-reload burst.
process.env.API_AUTH_RATE_LIMIT_MAX = '3';
process.env.API_AUTH_READ_RATE_LIMIT_MAX = '6';
process.env.API_UNAUTH_RATE_LIMIT_MAX = '2';
process.env.EMAIL_ENABLED = 'false';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function freshApp() {
  delete require.cache[require.resolve('../src/middleware/rateLimiter')];
  delete require.cache[require.resolve('../src/lib/config')];
  delete require.cache[require.resolve('../app')];
  return require('../app').createApp;
}

async function createParentAndLogin(db, http, label) {
  const passwordHash = await hashPassword(`rate-limit-read-${label}`);
  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('RLR', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;
  const email = `rlr-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, $4, true, true)`,
    [email, passwordHash, familyId, label]
  );

  const res = await fetch(`${http.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: `rate-limit-read-${label}` }),
  });
  let cookies = {};
  for (const h of getSetCookieHeaders(res)) cookies = mergeCookies(cookies, [h]);
  const body = JSON.parse(await res.text());
  return { cookies, csrf: body.csrfToken };
}

describe('P1 — dashboard read-burst gets its own rate-limit bucket', () => {
  test('3x simulated dashboard-load GET burst on read paths → 0 429s within read budget', async () => {
    const db = await setupTestDb();
    if (db.skip) {
      test.skip('No real DATABASE_URL');
      return;
    }
    const createApp = freshApp();
    const http = await listenApp(createApp);

    try {
      const user = await createParentAndLogin(db, http, 'burst');

      // Simulate the exact prod-observed burst: repeated GETs on the known
      // dashboard/settings read paths — well above the tiny 3/min mutation
      // bucket, but within the 6/min read bucket.
      const readPaths = ['/api/family', '/api/children', '/api/family/readiness', '/api/rewards/pending-requests', '/api/for-dig/goals'];
      const statuses = [];
      for (const p of readPaths) {
        const res = await fetch(`${http.baseUrl}${p}`, {
          headers: { Cookie: cookieHeader(user.cookies) },
        });
        statuses.push(res.status);
      }

      assert.ok(
        statuses.every((s) => s !== 429),
        `expected no 429s on read-burst paths, got: ${JSON.stringify(statuses)}`
      );
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('read bucket still enforces its own ceiling once exceeded', async () => {
    const db = await setupTestDb();
    if (db.skip) {
      test.skip('No real DATABASE_URL');
      return;
    }
    const createApp = freshApp();
    const http = await listenApp(createApp);

    try {
      const user = await createParentAndLogin(db, http, 'ceiling');

      let lastStatus = 200;
      for (let i = 0; i < 9; i++) {
        const res = await fetch(`${http.baseUrl}/api/family`, {
          headers: { Cookie: cookieHeader(user.cookies) },
        });
        lastStatus = res.status;
      }
      assert.equal(lastStatus, 429, 'read bucket (max 6) should 429 after 9 requests');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('mutation-capable apiLimiter bucket is untouched by a read-path burst', async () => {
    const db = await setupTestDb();
    if (db.skip) {
      test.skip('No real DATABASE_URL');
      return;
    }
    const createApp = freshApp();
    const http = await listenApp(createApp);

    try {
      const user = await createParentAndLogin(db, http, 'mutation');

      // Burn through the read bucket (5 requests to /api/family, a read path).
      for (let i = 0; i < 5; i++) {
        await fetch(`${http.baseUrl}/api/family`, { headers: { Cookie: cookieHeader(user.cookies) } });
      }

      // /api/rewards is NOT a dashboard read-burst path — it still uses the
      // standard apiLimiter bucket (max 3), which the read burst above must
      // not have consumed.
      let lastStatus = 200;
      for (let i = 0; i < 4; i++) {
        const res = await fetch(`${http.baseUrl}/api/rewards`, {
          headers: { Cookie: cookieHeader(user.cookies) },
        });
        lastStatus = res.status;
      }
      assert.equal(lastStatus, 429, 'standard bucket (max 3) should still 429 on its own budget, unaffected by read burst');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('two different parents get separate read buckets', async () => {
    const db = await setupTestDb();
    if (db.skip) {
      test.skip('No real DATABASE_URL');
      return;
    }
    const createApp = freshApp();
    const http = await listenApp(createApp);

    try {
      const userA = await createParentAndLogin(db, http, 'read-a');
      const userB = await createParentAndLogin(db, http, 'read-b');

      let lastStatusA = 200;
      for (let i = 0; i < 7; i++) {
        const res = await fetch(`${http.baseUrl}/api/family`, { headers: { Cookie: cookieHeader(userA.cookies) } });
        lastStatusA = res.status;
      }
      assert.equal(lastStatusA, 429, 'user A should exhaust their own read bucket');

      const resB = await fetch(`${http.baseUrl}/api/family`, { headers: { Cookie: cookieHeader(userB.cookies) } });
      assert.equal(resB.status, 200, 'user B must not share user A read bucket');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
