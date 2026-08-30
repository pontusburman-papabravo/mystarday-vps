'use strict';

/**
 * P0.4 — För Dig authorization / child scoping.
 * Feedback, activate, preview, and installs require an active parent_child link.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { routeChangedFiles } = require('../scripts/lib/test-routing/route.mjs');
const { FOR_DIG_GOALS } = require('../src/lib/for-dig-config');

const ROOT = path.join(__dirname, '..');
const GOAL_SLUG = FOR_DIG_GOALS[0].slug;
const INTENT_REASON = 'tydligare_rutiner';
const ACCESS_DENIED = 'Du har inte åtkomst till ett av valda barn.';
const EXTRA_PASSWORD = 'p04-for-dig-pass-12';

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function authFetch(baseUrl, session, path, { method = 'GET', body } = {}) {
  const headers = {
    Cookie: cookieHeader(session.cookies),
    'X-CSRF-Token': session.csrfToken,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function loginByEmail(baseUrl, email, password) {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginText = await loginRes.text();
  assert.equal(loginRes.status, 200, loginText);
  const loginBody = JSON.parse(loginText);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { email, password, cookies, csrfToken: loginBody.csrfToken };
}

async function enableForDig(db) {
  await db.query(
    `INSERT INTO features (slug, name, status)
     VALUES ('for_dig', 'För dig', 'live')
     ON CONFLICT (slug) DO UPDATE SET status = 'live'`
  );
}

async function insertParent(db, { familyId, email, name }) {
  const passwordHash = await hashPassword(EXTRA_PASSWORD);
  const row = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, $4, true, true)
     RETURNING id`,
    [email, passwordHash, familyId, name]
  );
  return row.rows[0].id;
}

async function lookupFamilyId(db, email) {
  const row = await db.query(
    'SELECT family_id FROM parent WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  );
  return row.rows[0].family_id;
}

async function seedScopedFamily(db, http) {
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await enableForDig(db);

  const primary = await registerAndLogin(http.baseUrl, { name: 'P04 Primary' });
  const familyId = await lookupFamilyId(db, primary.email);
  const childAId = await createChild(http.baseUrl, primary, {
    name: 'Barn A',
    birthday: '2018-01-15',
  });
  const childBId = await createChild(http.baseUrl, primary, {
    name: 'Barn B',
    birthday: '2019-03-20',
  });

  const siblingId = await insertParent(db, {
    familyId,
    email: `p04-sibling-${tag}@example.com`,
    name: 'Sibling B',
  });
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'shared')`,
    [siblingId, childBId]
  );

  const revokedId = await insertParent(db, {
    familyId,
    email: `p04-revoked-${tag}@example.com`,
    name: 'Revoked A',
  });
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'shared')`,
    [revokedId, childAId]
  );
  await db.query(
    `UPDATE parent_child SET revoked_at = NOW() WHERE parent_id = $1 AND child_id = $2`,
    [revokedId, childAId]
  );

  await insertParent(db, {
    familyId,
    email: `p04-unlinked-${tag}@example.com`,
    name: 'Unlinked',
  });

  const otherFamily = await registerAndLogin(http.baseUrl, { name: 'P04 Other' });
  const otherChildId = await createChild(http.baseUrl, otherFamily, {
    name: 'Barn C',
    birthday: '2017-06-01',
  });

  const sibling = await loginByEmail(http.baseUrl, `p04-sibling-${tag}@example.com`, EXTRA_PASSWORD);
  const revoked = await loginByEmail(http.baseUrl, `p04-revoked-${tag}@example.com`, EXTRA_PASSWORD);
  const unlinked = await loginByEmail(http.baseUrl, `p04-unlinked-${tag}@example.com`, EXTRA_PASSWORD);

  return {
    familyId,
    childAId,
    childBId,
    otherChildId,
    primary,
    sibling,
    revoked,
    unlinked,
    otherFamily,
  };
}

function assertDenied(result, label) {
  assert.equal(result.res.status, 403, `${label}: ${result.text}`);
  assert.equal(result.json?.error, ACCESS_DENIED, label);
}

async function postIntent(http, session, childId) {
  return authFetch(http.baseUrl, session, '/api/for-dig/feedback', {
    method: 'POST',
    body: {
      goal_slug: GOAL_SLUG,
      child_id: childId,
      phase: 'intent',
      intent_reason: INTENT_REASON,
    },
  });
}

async function postOutcome(http, session, childId) {
  return authFetch(http.baseUrl, session, '/api/for-dig/feedback', {
    method: 'POST',
    body: {
      goal_slug: GOAL_SLUG,
      child_id: childId,
      phase: 'outcome',
      outcome_score: 3,
    },
  });
}

async function postActivate(http, session, childId) {
  return authFetch(http.baseUrl, session, `/api/for-dig/${GOAL_SLUG}/activate`, {
    method: 'POST',
    body: { child_ids: [childId] },
  });
}

async function postPreview(http, session, childId) {
  return authFetch(http.baseUrl, session, `/api/for-dig/${GOAL_SLUG}/preview-plan`, {
    method: 'POST',
    body: { child_ids: [childId] },
  });
}

describe('P0.4 För Dig authorization', () => {
  test('classifier treats for-dig files as for-dig domain', () => {
    const plan = routeChangedFiles(ROOT, {
      files: ['src/routes/for-dig.js', 'db/for-dig-goal-feedback.js'],
    });
    assert.ok(plan.domains.includes('for-dig'));
  });

  test('installs query and feedback route require active parent_child', () => {
    const dbSrc = fs.readFileSync(path.join(ROOT, 'db/for-dig-goal-feedback.js'), 'utf8');
    const routeSrc = fs.readFileSync(path.join(ROOT, 'src/routes/for-dig.js'), 'utf8');
    assert.match(dbSrc, /async function getInstallsForParent/);
    assert.match(dbSrc, /pc\.revoked_at IS NULL/);
    assert.doesNotMatch(dbSrc, /function getInstallsForFamily/);
    assert.match(routeSrc, /getInstallsForParent\(req\.user\.id\)/);
    assert.match(routeSrc, /authz\.getChildAccess\(req\.user\.id, childId\)/);
    assert.match(routeSrc, /Du har inte åtkomst till ett av valda barn\./);
  });

  test('primary can write feedback; suggestion without child_id stays allowed', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const fx = await seedScopedFamily(db, http);

      const suggestion = await authFetch(http.baseUrl, fx.primary, '/api/for-dig/feedback', {
        method: 'POST',
        body: {
          goal_slug: GOAL_SLUG,
          phase: 'suggestion',
          free_text: 'P0.4 suggestion without child',
        },
      });
      assert.equal(suggestion.res.status, 201, suggestion.text);

      const intent = await postIntent(http, fx.primary, fx.childAId);
      assert.equal(intent.res.status, 201, intent.text);

      const outcome = await postOutcome(http, fx.primary, fx.childAId);
      assert.equal(outcome.res.status, 201, outcome.text);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('revoked, unlinked, sibling-only, and cross-family callers get 403', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const fx = await seedScopedFamily(db, http);
      const denied = [
        ['revoked intent', fx.revoked],
        ['unlinked intent', fx.unlinked],
        ['sibling-only intent', fx.sibling],
        ['cross-family intent', fx.otherFamily],
      ];
      for (const [label, session] of denied) {
        assertDenied(await postIntent(http, session, fx.childAId), label);
        assertDenied(await postOutcome(http, session, fx.childAId), `${label} outcome`);
        assertDenied(await postActivate(http, session, fx.childAId), `${label} activate`);
        assertDenied(await postPreview(http, session, fx.childAId), `${label} preview`);
      }

      const siblingOwn = await postIntent(http, fx.sibling, fx.childBId);
      assert.equal(siblingOwn.res.status, 201, siblingOwn.text);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('activate 403 happens before library work', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const fx = await seedScopedFamily(db, http);
      const denied = await postActivate(http, fx.sibling, fx.childAId);
      assertDenied(denied, 'sibling activate before library');
      assert.notEqual(denied.res.status, 500);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('installs and pending hide sibling/revoked/unlinked children', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const fx = await seedScopedFamily(db, http);
      await db.query(
        `INSERT INTO for_dig_goal_install (goal_slug, family_id, child_id, parent_id, installed_at)
         VALUES ($1, $2, $3, NULL, NOW() - INTERVAL '8 days'),
                ($1, $2, $4, NULL, NOW() - INTERVAL '8 days')
         ON CONFLICT (goal_slug, family_id, child_id)
         DO UPDATE SET installed_at = EXCLUDED.installed_at`,
        [GOAL_SLUG, fx.familyId, fx.childAId, fx.childBId]
      );

      const primaryInstalls = await authFetch(http.baseUrl, fx.primary, '/api/for-dig/installs');
      assert.equal(primaryInstalls.res.status, 200, primaryInstalls.text);
      const primaryChildIds = primaryInstalls.json.installs.map((row) => row.child_id).sort();
      assert.deepEqual(primaryChildIds, [fx.childAId, fx.childBId].sort());

      const siblingInstalls = await authFetch(http.baseUrl, fx.sibling, '/api/for-dig/installs');
      assert.equal(siblingInstalls.res.status, 200, siblingInstalls.text);
      assert.deepEqual(
        siblingInstalls.json.installs.map((row) => row.child_id),
        [fx.childBId]
      );
      assert.ok(!siblingInstalls.json.installs.some((row) => row.child_id === fx.childAId));

      const revokedInstalls = await authFetch(http.baseUrl, fx.revoked, '/api/for-dig/installs');
      assert.equal(revokedInstalls.res.status, 200, revokedInstalls.text);
      assert.deepEqual(revokedInstalls.json.installs, []);

      const unlinkedInstalls = await authFetch(http.baseUrl, fx.unlinked, '/api/for-dig/installs');
      assert.equal(unlinkedInstalls.res.status, 200, unlinkedInstalls.text);
      assert.deepEqual(unlinkedInstalls.json.installs, []);

      const otherInstalls = await authFetch(http.baseUrl, fx.otherFamily, '/api/for-dig/installs');
      assert.equal(otherInstalls.res.status, 200, otherInstalls.text);
      assert.ok(!otherInstalls.json.installs.some((row) => row.child_id === fx.childAId));

      const siblingPending = await authFetch(http.baseUrl, fx.sibling, '/api/for-dig/feedback/pending');
      assert.equal(siblingPending.res.status, 200, siblingPending.text);
      assert.ok(!siblingPending.json.some((row) => row.child_id === fx.childAId));
      assert.ok(siblingPending.json.some((row) => row.child_id === fx.childBId));

      const primaryPending = await authFetch(http.baseUrl, fx.primary, '/api/for-dig/feedback/pending');
      assert.equal(primaryPending.res.status, 200, primaryPending.text);
      const pendingIds = primaryPending.json.map((row) => row.child_id).sort();
      assert.ok(pendingIds.includes(fx.childAId));
      assert.ok(pendingIds.includes(fx.childBId));
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
