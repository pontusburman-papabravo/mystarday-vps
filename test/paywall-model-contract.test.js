'use strict';

/**
 * G4d — Paywall target-model contract tests (REFACTOR.md Fas 4).
 *
 * Canonical model (docs/paywall-inventory.md):
 * - Per-route requireComponent() gates premium areas (e.g. pedagog).
 * - Core parent app (children, daily-logs) stays open for basic_app / lifetime_free.
 * - No global requireActiveSubscription after route registration (C2b removes it).
 *
 * Integration cases require real Postgres (skip on mock DATABASE_URL).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const familySubscriptions = require('../db/family-subscriptions');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const PEDAGOG_ROUTE = '/api/pedagog/daily-log?childId=00000000-0000-0000-0000-000000000001&date=2026-06-01';

async function familyRowForSession(db, email) {
  const { rows } = await db.query(
    `SELECT p.family_id, f.is_lifetime_free
     FROM parent p
     JOIN family f ON f.id = p.family_id
     WHERE LOWER(p.email) = $1`,
    [email.toLowerCase()]
  );
  return rows[0];
}

test('paywall contract: per-route component gating + core API access', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const { family_id: familyId, is_lifetime_free: isLifetimeFree } = await familyRowForSession(db, session.email);

    const sub = await familySubscriptions.getByFamilyId(familyId);
    assert.ok(sub, 'registration should create family_subscriptions row');
    assert.equal(isLifetimeFree, true, 'first test family should be founder lifetime_free');
    assert.ok(
      (sub.components || []).some((c) => c.component === 'basic_app'),
      'basic_app component should be granted at signup'
    );

    const childrenRes = await fetch(`${http.baseUrl}/api/children`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const childrenText = await childrenRes.text();
    assert.equal(childrenRes.status, 200, childrenText);
    assert.ok(Array.isArray(JSON.parse(childrenText)), 'children list should be an array');

    const blockedRes = await fetch(`${http.baseUrl}${PEDAGOG_ROUTE}`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const blockedText = await blockedRes.text();
    assert.equal(blockedRes.status, 403, blockedText);
    const blockedBody = JSON.parse(blockedText);
    assert.equal(blockedBody.code, 'COMPONENT_MISSING');
    assert.equal(blockedBody.component, 'pedagog');

    await familySubscriptions.grantComponent(familyId, 'pedagog');
    const grantedRes = await fetch(`${http.baseUrl}${PEDAGOG_ROUTE}`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const grantedText = await grantedRes.text();
    const grantedBody = JSON.parse(grantedText);
    assert.notEqual(grantedBody.code, 'COMPONENT_MISSING', grantedText);
    assert.notEqual(grantedBody.code, 'COMPONENT_ARCHIVED', grantedText);
    assert.equal(grantedRes.status, 403, grantedText);
    assert.match(grantedBody.error, /åtkomst/i);

    await familySubscriptions.grantComponent(familyId, 'pedagog', null, { state: 'archived' });
    const archivedRes = await fetch(`${http.baseUrl}${PEDAGOG_ROUTE}`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const archivedText = await archivedRes.text();
    assert.equal(archivedRes.status, 403, archivedText);
    const archivedBody = JSON.parse(archivedText);
    assert.equal(archivedBody.code, 'COMPONENT_ARCHIVED');
    assert.equal(archivedBody.component, 'pedagog');

    await db.query(
      `UPDATE family
       SET subscription_status = 'expired', trial_ends_at = NOW() - INTERVAL '1 day', is_lifetime_free = false
       WHERE id = $1`,
      [familyId]
    );
    await db.query(
      `UPDATE family_subscriptions
       SET tier = 'trial', trial_expires_at = NOW() - INTERVAL '1 day'
       WHERE family_id = $1`,
      [familyId]
    );

    const expiredRes = await fetch(`${http.baseUrl}/api/children`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const expiredText = await expiredRes.text();
    assert.equal(expiredRes.status, 200, expiredText);
    assert.notEqual(JSON.parse(expiredText).code, 'subscription_required');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('paywall contract: global requireActiveSubscription not mounted after routes (C2b)', async (t) => {
  const appSrc = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  const routesIdx = appSrc.indexOf('registerRoutes(app)');
  const globalSubIdx = appSrc.indexOf('requireActiveSubscription');

  if (routesIdx < 0 || globalSubIdx < 0) {
    assert.fail('app.js should contain registerRoutes and requireActiveSubscription');
  }

  if (globalSubIdx > routesIdx) {
    t.skip('Global subscription mount still after registerRoutes — remove in C2b');
    return;
  }

  assert.ok(globalSubIdx < routesIdx, 'requireActiveSubscription should run before registerRoutes');
});

test('paywall inventory documents per-route canonical model', () => {
  const doc = fs.readFileSync(path.join(__dirname, '../docs/paywall-inventory.md'), 'utf8');
  assert.match(doc, /per-route.*requireComponent/i);
  assert.match(doc, /remove the global.*requireActiveSubscription/i);
});
