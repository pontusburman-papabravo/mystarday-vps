'use strict';

/**
 * P0.1 — account/family deletion authorization (adversarial integration).
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

const ROOT = path.join(__dirname, '..');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
process.env.AUTHZ_HARDENING_ENABLED = 'true';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
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

async function deleteAccount(baseUrl, session) {
  return fetch(`${baseUrl}/api/family/delete-account`, {
    method: 'DELETE',
    headers: {
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
  });
}

async function inviteAndAcceptCoParent(baseUrl, db, primary, childId) {
  const coparentEmail = `coparent-p01-${Date.now()}@example.com`;
  const coparentPassword = 'coparent-pass-12';
  const inviteRes = await fetch(`${baseUrl}/api/family/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(primary.cookies),
      'X-CSRF-Token': primary.csrfToken,
    },
    body: JSON.stringify({
      name: 'Co Parent',
      email: coparentEmail,
      child_ids: [childId],
    }),
  });
  assert.equal(inviteRes.status, 201, await inviteRes.text());

  const tokenRow = await db.query(
    `SELECT token FROM family_invite WHERE LOWER(email) = $1 AND accepted = false ORDER BY created_at DESC LIMIT 1`,
    [coparentEmail.toLowerCase()]
  );
  const token = tokenRow.rows[0].token;

  const acceptRes = await fetch(`${baseUrl}/api/family/invite/accept-new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: coparentPassword }),
  });
  assert.equal(acceptRes.status, 201, await acceptRes.text());

  return loginByEmail(baseUrl, coparentEmail, coparentPassword);
}

async function familyStateSnapshot(db, familyId) {
  const [family, parents, children, links, rewards, subs] = await Promise.all([
    db.query('SELECT id FROM family WHERE id = $1', [familyId]),
    db.query('SELECT id FROM parent WHERE family_id = $1 ORDER BY id', [familyId]),
    db.query('SELECT id FROM child WHERE family_id = $1 ORDER BY id', [familyId]),
    db.query(
      `SELECT parent_id, child_id, role, revoked_at IS NOT NULL AS revoked
       FROM parent_child
       WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)
          OR child_id IN (SELECT id FROM child WHERE family_id = $1)
       ORDER BY parent_id, child_id`,
      [familyId]
    ),
    db.query('SELECT COUNT(*)::int AS n FROM reward WHERE family_id = $1', [familyId]),
    db.query('SELECT COUNT(*)::int AS n FROM family_subscriptions WHERE family_id = $1', [familyId]),
  ]);
  return {
    familyExists: family.rows.length > 0,
    parentIds: parents.rows.map((r) => r.id),
    childIds: children.rows.map((r) => r.id),
    links: links.rows,
    rewardCount: rewards.rows[0]?.n ?? 0,
    subscriptionRows: subs.rows[0]?.n ?? 0,
  };
}

async function lookupFamilyId(db, email) {
  const row = await db.query(
    'SELECT family_id FROM parent WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  );
  return row.rows[0]?.family_id;
}

async function fetchFamily(baseUrl, session) {
  const res = await fetch(`${baseUrl}/api/family`, {
    headers: { Cookie: cookieHeader(session.cookies) },
  });
  const text = await res.text();
  assert.equal(res.status, 200, text);
  return JSON.parse(text);
}

function activeAdminLinks(snapshot) {
  return snapshot.links.filter(
    (link) => !link.revoked && (link.role === 'primary' || link.role === 'shared')
  );
}

async function ensureDeletionJobTable(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS deletion_job (
      parent_id UUID PRIMARY KEY,
      family_id UUID,
      status TEXT,
      error TEXT,
      deleted_at TIMESTAMPTZ
    )
  `);
}

describe('P0.1 account deletion authorization', () => {
  test('routing classifies account.js as R3 without fail-closed', () => {
    const plan = routeChangedFiles(ROOT, { files: ['src/routes/family/account.js'] });
    assert.equal(plan.riskClass, 'R3');
    assert.ok(plan.domains.includes('account-deletion'));
    assert.ok(plan.domains.includes('auth-security'));
    assert.ok(plan.domains.includes('parent-experience'));
    assert.notEqual(plan.verificationPlan.failClosed, true);
    assert.equal(plan.verificationPlan.L3.required, true);
  });

  test('primary + co-parent: caller delete-account removes only caller', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
      const familyId = await lookupFamilyId(db, primary.email);
      const childId = await createChild(http.baseUrl, primary, { name: 'Barn', emoji: '⭐' });
      const coparent = await inviteAndAcceptCoParent(http.baseUrl, db, primary, childId);
      const primaryId = (
        await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [primary.email.toLowerCase()])
      ).rows[0].id;
      const before = await familyStateSnapshot(db, familyId);

      const delRes = await deleteAccount(http.baseUrl, primary);
      const text = await delRes.text();
      assert.equal(delRes.status, 200, text);
      const body = JSON.parse(text);
      assert.equal(body.mode, 'self');

      const after = await familyStateSnapshot(db, familyId);
      assert.equal(after.familyExists, true);
      assert.equal(after.childIds.length, before.childIds.length);
      assert.equal(after.parentIds.length, before.parentIds.length - 1);
      assert.ok(!after.parentIds.includes(primaryId));
      const coparentStill = await db.query(
        'SELECT 1 FROM parent WHERE LOWER(email) = $1 AND family_id = $2',
        [coparent.email.toLowerCase(), familyId]
      );
      assert.equal(coparentStill.rows.length, 1);
      assert.ok(after.rewardCount >= before.rewardCount || before.rewardCount > 0);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('last authorized adult: delete-account removes entire family', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'Solo' });
      const familyId = await lookupFamilyId(db, primary.email);
      await createChild(http.baseUrl, primary, { name: 'SoloBarn', emoji: '🌟' });
      const before = await familyStateSnapshot(db, familyId);
      assert.ok(before.familyExists);

      const delRes = await deleteAccount(http.baseUrl, primary);
      const text = await delRes.text();
      assert.equal(delRes.status, 200, text);
      const body = JSON.parse(text);
      assert.equal(body.mode, 'family');

      const after = await familyStateSnapshot(db, familyId);
      assert.equal(after.familyExists, false);
      assert.equal(after.parentIds.length, 0);
      assert.equal(after.childIds.length, 0);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('last family parent without children: delete-account removes family', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'Empty' });
      const familyId = await lookupFamilyId(db, primary.email);
      const fam = await fetchFamily(http.baseUrl, primary);
      assert.equal(fam.deletion_impact.mode, 'family');
      const delRes = await deleteAccount(http.baseUrl, primary);
      const text = await delRes.text();
      assert.equal(delRes.status, 200, text);
      assert.equal(JSON.parse(text).mode, 'family');
      const after = await familyStateSnapshot(db, familyId);
      assert.equal(after.familyExists, false);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('pedagog-only parent denied with zero mutation', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const tag = `ped-p01-${Date.now()}`;
      const password = `pw-${tag}`;
      const passwordHash = await hashPassword(password);
      const familyId = (await db.query(`INSERT INTO family (name) VALUES ('Ped Fam') RETURNING id`)).rows[0].id;
      await db.query(
        `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed, account_type)
         VALUES ($1, $2, $3, 'Pedagog', true, true, 'educator')`,
        [`pedagog-${tag}@example.com`, passwordHash, familyId]
      );
      const childId = (
        await db.query(`INSERT INTO child (family_id, name, emoji) VALUES ($1, 'Kid', '⭐') RETURNING id`, [familyId])
      ).rows[0].id;
      const pedagogId = (
        await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [`pedagog-${tag}@example.com`])
      ).rows[0].id;
      await db.query(
        `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'pedagog')`,
        [pedagogId, childId]
      );
      const before = await familyStateSnapshot(db, familyId);
      const session = await loginByEmail(http.baseUrl, `pedagog-${tag}@example.com`, password);
      const delRes = await deleteAccount(http.baseUrl, session);
      assert.equal(delRes.status, 403, await delRes.text());
      const after = await familyStateSnapshot(db, familyId);
      assert.deepEqual(after, before);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('revoked adult denied with zero mutation', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
      const familyId = await lookupFamilyId(db, primary.email);
      const childId = await createChild(http.baseUrl, primary, { name: 'Barn', emoji: '⭐' });
      const coparent = await inviteAndAcceptCoParent(http.baseUrl, db, primary, childId);
      const coparentId = (
        await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [coparent.email.toLowerCase()])
      ).rows[0].id;
      const primaryId = (
        await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [primary.email.toLowerCase()])
      ).rows[0].id;
      await db.query(
        `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $2 WHERE parent_id = $1`,
        [coparentId, primaryId]
      );
      const before = await familyStateSnapshot(db, familyId);
      const delRes = await deleteAccount(http.baseUrl, coparent);
      assert.equal(delRes.status, 403, await delRes.text());
      const after = await familyStateSnapshot(db, familyId);
      assert.deepEqual(after, before);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('unauthenticated delete-account denied', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const session = await registerAndLogin(http.baseUrl, { name: 'Witness' });
      const familyId = await lookupFamilyId(db, session.email);
      const before = await familyStateSnapshot(db, familyId);
      const res = await fetch(`${http.baseUrl}/api/family/delete-account`, { method: 'DELETE' });
      const text = await res.text();
      assert.equal(res.status, 403, text);
      const body = JSON.parse(text);
      assert.equal(body.code, 'CSRF_MISSING');
      const after = await familyStateSnapshot(db, familyId);
      assert.deepEqual(after, before);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('legacy delete-immediate returns 410', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const session = await registerAndLogin(http.baseUrl);
      const familyId = await lookupFamilyId(db, session.email);
      const before = await familyStateSnapshot(db, familyId);
      const res = await fetch(`${http.baseUrl}/api/account/delete-immediate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ password: session.password }),
      });
      assert.equal(res.status, 410, await res.text());
      const after = await familyStateSnapshot(db, familyId);
      assert.deepEqual(after, before);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('child session cannot delete-account', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const parent = await registerAndLogin(http.baseUrl, { name: 'Parent' });
      const familyId = await lookupFamilyId(db, parent.email);
      const childId = await createChild(http.baseUrl, parent, { name: 'Kid', emoji: '⭐' });
      const pinRes = await fetch(`${http.baseUrl}/api/children/${childId}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(parent.cookies),
          'X-CSRF-Token': parent.csrfToken,
        },
        body: JSON.stringify({ pin: '2580' }),
      });
      assert.equal(pinRes.status, 200, await pinRes.text());
      const childRow = await db.query('SELECT username FROM child WHERE id = $1', [childId]);
      const childLoginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: childRow.rows[0].username, pin: '2580' }),
      });
      assert.equal(childLoginRes.status, 200, await childLoginRes.text());
      let childCookies = {};
      for (const header of getSetCookieHeaders(childLoginRes)) {
        childCookies = mergeCookies(childCookies, [header]);
      }
      const before = await familyStateSnapshot(db, familyId);
      const delRes = await fetch(`${http.baseUrl}/api/family/delete-account`, {
        method: 'DELETE',
        headers: { Cookie: cookieHeader(childCookies) },
      });
      const delText = await delRes.text();
      console.log('P0.1 CHILD SESSION DELETE', delRes.status, delText);
      assert.ok(delRes.status === 401 || delRes.status === 403, delText);
      const after = await familyStateSnapshot(db, familyId);
      assert.deepEqual(after, before);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('unrelated family unchanged when another family deletes self', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const familyA = await registerAndLogin(http.baseUrl, { name: 'Family A' });
      const familyAId = await lookupFamilyId(db, familyA.email);
      const childA = await createChild(http.baseUrl, familyA, { name: 'A Child', emoji: '🅰️' });
      const familyB = await registerAndLogin(http.baseUrl, { name: 'Family B' });
      const familyBId = await lookupFamilyId(db, familyB.email);
      await createChild(http.baseUrl, familyB, { name: 'B Child', emoji: '🅱️' });
      const coparent = await inviteAndAcceptCoParent(http.baseUrl, db, familyA, childA);
      const beforeB = await familyStateSnapshot(db, familyBId);

      const delRes = await deleteAccount(http.baseUrl, familyA);
      assert.equal(delRes.status, 200, await delRes.text());

      const afterB = await familyStateSnapshot(db, familyBId);
      assert.deepEqual(afterB, beforeB);
      assert.ok((await familyStateSnapshot(db, familyAId)).familyExists);
      const coparentRow = await db.query(
        'SELECT 1 FROM parent WHERE LOWER(email) = $1 AND family_id = $2',
        [coparent.email.toLowerCase(), familyAId]
      );
      assert.equal(coparentRow.rows.length, 1);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('deletion_impact: caller + revoked adult => family', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
      const childId = await createChild(http.baseUrl, primary, { name: 'Barn', emoji: '⭐' });
      const coparent = await inviteAndAcceptCoParent(http.baseUrl, db, primary, childId);
      const coparentId = (
        await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [coparent.email.toLowerCase()])
      ).rows[0].id;
      const primaryId = (
        await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [primary.email.toLowerCase()])
      ).rows[0].id;
      await db.query(
        `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $2 WHERE parent_id = $1`,
        [coparentId, primaryId]
      );
      const fam = await fetchFamily(http.baseUrl, primary);
      assert.ok(fam.parents.length >= 2);
      assert.equal(fam.deletion_impact.mode, 'family');
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('deletion_impact: caller + pedagog-only adult => family', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
      const familyId = await lookupFamilyId(db, primary.email);
      const childId = await createChild(http.baseUrl, primary, { name: 'Barn', emoji: '⭐' });
      const passwordHash = await hashPassword('ped-pass-12');
      const pedagogId = (
        await db.query(
          `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed, account_type)
           VALUES ($1, $2, $3, 'Pedagog', true, true, 'educator') RETURNING id`,
          [`impact-ped-${Date.now()}@example.com`, passwordHash, familyId]
        )
      ).rows[0].id;
      await db.query(
        `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'pedagog')`,
        [pedagogId, childId]
      );
      const fam = await fetchFamily(http.baseUrl, primary);
      assert.ok(fam.parents.length >= 2);
      assert.equal(fam.deletion_impact.mode, 'family');
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('deletion_impact: caller + active shared adult => self', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
      const childId = await createChild(http.baseUrl, primary, { name: 'Barn', emoji: '⭐' });
      await inviteAndAcceptCoParent(http.baseUrl, db, primary, childId);
      const fam = await fetchFamily(http.baseUrl, primary);
      assert.ok(fam.parents.length >= 2);
      assert.equal(fam.deletion_impact.mode, 'self');
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('legacy soft-delete returns 410', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const session = await registerAndLogin(http.baseUrl);
      const familyId = await lookupFamilyId(db, session.email);
      const before = await familyStateSnapshot(db, familyId);
      const headers = {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      };
      const deleteRes = await fetch(`${http.baseUrl}/api/account/delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      assert.equal(deleteRes.status, 410, await deleteRes.text());
      const after = await familyStateSnapshot(db, familyId);
      assert.deepEqual(after, before);
      const pending = await db.query(
        'SELECT pending_deletion FROM parent WHERE LOWER(email) = $1',
        [session.email.toLowerCase()]
      );
      assert.equal(pending.rows[0].pending_deletion, false);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('legacy cancel-deletion returns 410', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const session = await registerAndLogin(http.baseUrl);
      const familyId = await lookupFamilyId(db, session.email);
      const before = await familyStateSnapshot(db, familyId);
      const cancelRes = await fetch(`${http.baseUrl}/api/account/cancel-deletion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({}),
      });
      assert.equal(cancelRes.status, 410, await cancelRes.text());
      const after = await familyStateSnapshot(db, familyId);
      assert.deepEqual(after, before);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('scheduler pending authorized adult with another active admin removes only caller', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    try {
      await ensureDeletionJobTable(db);
      const passwordHash = await hashPassword('sched-pass-12');
      const familyId = (await db.query(`INSERT INTO family (name) VALUES ('Sched Two') RETURNING id`)).rows[0].id;
      const pendingId = (
        await db.query(
          `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed, pending_deletion, deletion_requested_at)
           VALUES ($1, $2, $3, 'Pending', true, true, true, NOW() - INTERVAL '31 days') RETURNING id`,
          [`sched-pending-${Date.now()}@example.com`, passwordHash, familyId]
        )
      ).rows[0].id;
      const stayId = (
        await db.query(
          `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed, pending_deletion)
           VALUES ($1, $2, $3, 'Stay', true, true, false) RETURNING id`,
          [`sched-stay-${Date.now()}@example.com`, passwordHash, familyId]
        )
      ).rows[0].id;
      const childId = (
        await db.query(`INSERT INTO child (family_id, name, emoji) VALUES ($1, 'Kid', '⭐') RETURNING id`, [familyId])
      ).rows[0].id;
      await db.query(
        `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary'), ($3, $2, 'shared')`,
        [pendingId, childId, stayId]
      );
      const { runDeletionJob } = require('../src/lib/deletion-scheduler');
      await runDeletionJob();
      const after = await familyStateSnapshot(db, familyId);
      assert.equal(after.familyExists, true);
      assert.ok(!after.parentIds.includes(pendingId));
      assert.ok(after.parentIds.includes(stayId));
      assert.equal(after.childIds.length, 1);
      assert.ok(activeAdminLinks(after).length >= 1);
    } finally {
      await db.cleanup();
    }
  });

  test('scheduler pending last authorized adult deletes family', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    try {
      await ensureDeletionJobTable(db);
      const passwordHash = await hashPassword('sched-pass-12');
      const familyId = (await db.query(`INSERT INTO family (name) VALUES ('Sched Last') RETURNING id`)).rows[0].id;
      const adminId = (
        await db.query(
          `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed, pending_deletion, deletion_requested_at)
           VALUES ($1, $2, $3, 'Admin', true, true, true, NOW() - INTERVAL '31 days') RETURNING id`,
          [`sched-admin-${Date.now()}@example.com`, passwordHash, familyId]
        )
      ).rows[0].id;
      const pedagogId = (
        await db.query(
          `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed, account_type, pending_deletion)
           VALUES ($1, $2, $3, 'Pedagog', true, true, 'educator', false) RETURNING id`,
          [`sched-ped-${Date.now()}@example.com`, passwordHash, familyId]
        )
      ).rows[0].id;
      const childId = (
        await db.query(`INSERT INTO child (family_id, name, emoji) VALUES ($1, 'Kid', '⭐') RETURNING id`, [familyId])
      ).rows[0].id;
      await db.query(
        `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary'), ($3, $2, 'pedagog')`,
        [adminId, childId, pedagogId]
      );
      const { runDeletionJob } = require('../src/lib/deletion-scheduler');
      await runDeletionJob();
      const after = await familyStateSnapshot(db, familyId);
      assert.equal(after.familyExists, false);
      assert.equal(after.parentIds.length, 0);
      assert.equal(after.childIds.length, 0);
    } finally {
      await db.cleanup();
    }
  });

  test('scheduler pending revoked adult never deletes family', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    try {
      await ensureDeletionJobTable(db);
      const passwordHash = await hashPassword('sched-pass-12');
      const familyId = (await db.query(`INSERT INTO family (name) VALUES ('Sched Revoked') RETURNING id`)).rows[0].id;
      const adminId = (
        await db.query(
          `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed, pending_deletion)
           VALUES ($1, $2, $3, 'Admin', true, true, false) RETURNING id`,
          [`sched-keep-${Date.now()}@example.com`, passwordHash, familyId]
        )
      ).rows[0].id;
      const revokedId = (
        await db.query(
          `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed, pending_deletion, deletion_requested_at)
           VALUES ($1, $2, $3, 'Revoked', true, true, true, NOW() - INTERVAL '31 days') RETURNING id`,
          [`sched-revoked-${Date.now()}@example.com`, passwordHash, familyId]
        )
      ).rows[0].id;
      const childId = (
        await db.query(`INSERT INTO child (family_id, name, emoji) VALUES ($1, 'Kid', '⭐') RETURNING id`, [familyId])
      ).rows[0].id;
      await db.query(
        `INSERT INTO parent_child (parent_id, child_id, role, revoked_at, revoked_by)
         VALUES ($1, $2, 'primary', NULL, NULL), ($3, $2, 'shared', NOW(), $1)`,
        [adminId, childId, revokedId]
      );
      const { runDeletionJob } = require('../src/lib/deletion-scheduler');
      await runDeletionJob();
      const after = await familyStateSnapshot(db, familyId);
      assert.equal(after.familyExists, true);
      assert.ok(!after.parentIds.includes(revokedId));
      assert.ok(after.parentIds.includes(adminId));
      assert.equal(after.childIds.length, 1);
      assert.ok(activeAdminLinks(after).some((link) => link.parent_id === adminId));
    } finally {
      await db.cleanup();
    }
  });

  test('concurrent self-removal cannot orphan children', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
      const familyId = await lookupFamilyId(db, primary.email);
      const childId = await createChild(http.baseUrl, primary, { name: 'Barn', emoji: '⭐' });
      const coparent = await inviteAndAcceptCoParent(http.baseUrl, db, primary, childId);

      const [firstRes, secondRes] = await Promise.all([
        deleteAccount(http.baseUrl, primary),
        deleteAccount(http.baseUrl, coparent),
      ]);
      const firstText = await firstRes.text();
      const secondText = await secondRes.text();
      assert.ok(
        [firstRes.status, secondRes.status].every((status) => status === 200),
        `concurrent delete-account: ${firstRes.status} ${firstText} ${secondRes.status} ${secondText}`
      );

      const after = await familyStateSnapshot(db, familyId);
      if (after.familyExists) {
        assert.ok(after.childIds.includes(childId));
        assert.ok(
          activeAdminLinks(after).length >= 1,
          `existing child with zero authorized adults: ${JSON.stringify(after)}`
        );
      } else {
        assert.equal(after.childIds.length, 0);
        assert.equal(after.parentIds.length, 0);
      }
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });
});

describe('P0.1 avatar rollback safety', () => {
  test('family deletion cleans avatars after DB commit', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/family/account.js'), 'utf8');
    assert.match(src, /await client\.query\('COMMIT'\)/);
    assert.match(src, /cleanupFamilyAvatarsAfterCommit/);
    assert.doesNotMatch(src, /await deleteAvatarsForFamily\([\s\S]*COMMIT/s);
  });

  test('self-removal cleans parent avatar after DB commit', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/family/account.js'), 'utf8');
    assert.match(src, /cleanupParentAvatarAfterCommit/);
  });
});

describe('P0.1 settings deletion consequence', () => {
  test('settings copy uses server deletion_impact not raw parent count', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    assert.match(src, /deletion_impact/);
    assert.match(src, /isSelfLeaveDeletion/);
    assert.doesNotMatch(src, /function isMultiAdultFamily/);
    assert.doesNotMatch(src, /familyParents\.length > 1/);
  });
});
