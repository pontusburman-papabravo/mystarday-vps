'use strict';

/**
 * D2 — pending family invites and parent child-links are viewer-scoped.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');

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

async function getFamily(baseUrl, session) {
  const res = await fetch(`${baseUrl}/api/family`, {
    headers: {
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
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

async function lookupIds(db, email) {
  const row = await db.query(
    'SELECT id, family_id FROM parent WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  );
  return row.rows[0];
}

async function insertSiblingParent(db, { familyId, email, password, name }) {
  const passwordHash = await hashPassword(password);
  const row = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, $4, true, true)
     RETURNING id`,
    [email.toLowerCase(), passwordHash, familyId, name]
  );
  return row.rows[0].id;
}

async function insertPendingFamilyInvite(db, { familyId, email, childIds }) {
  const token = `d2-fi-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const row = await db.query(
    `INSERT INTO family_invite (family_id, email, child_ids, token, expires_at, accepted, invitee_name)
     VALUES ($1, $2, $3::uuid[], $4, NOW() + INTERVAL '7 days', false, 'Invitee')
     RETURNING id, email, child_ids`,
    [familyId, email.toLowerCase(), childIds, token]
  );
  return row.rows[0];
}

function inviteByEmail(invites, email) {
  return (invites || []).find((inv) => String(inv.email).toLowerCase() === email.toLowerCase()) || null;
}

describe('D2 family invite + parent-link viewer scoping', () => {
  test('sibling-only viewer never sees hidden invite email or child ids', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real TEST_DATABASE_URL');
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const primary = await registerAndLogin(http.baseUrl, { name: 'D2 Primary' });
      const childA = await createChild(http.baseUrl, primary, { name: 'HiddenA', birthday: '2017-01-01' });
      const childB = await createChild(http.baseUrl, primary, { name: 'VisibleB', birthday: '2018-01-01' });
      const ids = await lookupIds(db, primary.email);
      assert.ok(ids && ids.id && ids.family_id);

      const siblingEmail = `d2-sibling-${tag}@example.com`;
      const siblingPassword = 'd2-sibling-pass-12';
      const siblingId = await insertSiblingParent(db, {
        familyId: ids.family_id,
        email: siblingEmail,
        password: siblingPassword,
        name: 'Sibling B',
      });
      await db.query(
        `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'shared')`,
        [siblingId, childB]
      );

      const emailIA = `d2-ia-${tag}@example.com`;
      const emailIB = `d2-ib-${tag}@example.com`;
      const emailIAB = `d2-iab-${tag}@example.com`;
      const emailIAll = `d2-iall-${tag}@example.com`;
      const inviteIA = await insertPendingFamilyInvite(db, {
        familyId: ids.family_id,
        email: emailIA,
        childIds: [childA],
      });
      const inviteIB = await insertPendingFamilyInvite(db, {
        familyId: ids.family_id,
        email: emailIB,
        childIds: [childB],
      });
      const inviteIAB = await insertPendingFamilyInvite(db, {
        familyId: ids.family_id,
        email: emailIAB,
        childIds: [childA, childB],
      });
      const inviteIAll = await insertPendingFamilyInvite(db, {
        familyId: ids.family_id,
        email: emailIAll,
        childIds: [],
      });

      const sibling = await loginByEmail(http.baseUrl, siblingEmail, siblingPassword);
      const siblingFamily = await getFamily(http.baseUrl, sibling);
      assert.equal(siblingFamily.res.status, 200, siblingFamily.text);
      const siblingBody = siblingFamily.text;
      assert.ok(!siblingBody.includes(emailIA), 'hidden invite email must not serialize');
      assert.ok(!siblingBody.includes(childA), 'hidden child UUID must not serialize');
      assert.ok(!siblingBody.includes(inviteIA.id), 'hidden invite id should stay out');

      const pending = siblingFamily.json.pendingInvites || [];
      assert.equal(inviteByEmail(pending, emailIA), null);
      const ib = inviteByEmail(pending, emailIB);
      assert.ok(ib, 'IB targeting visible child B must remain');
      assert.deepEqual((ib.child_ids || []).map(String), [String(childB)]);
      const iab = inviteByEmail(pending, emailIAB);
      assert.ok(iab, 'IAB overlapping B must remain');
      assert.deepEqual((iab.child_ids || []).map(String), [String(childB)]);
      assert.ok(!(iab.child_ids || []).map(String).includes(String(childA)));
      const iall = inviteByEmail(pending, emailIAll);
      assert.ok(iall, 'legacy family-wide empty child_ids stays visible');
      assert.deepEqual(iall.child_ids || [], []);

      const primaryInSiblingView = (siblingFamily.json.parents || []).find((p) => p.id === ids.id);
      assert.ok(primaryInSiblingView, 'family adults remain visible');
      const linkedIds = (primaryInSiblingView.linked_child_ids || []).map(String);
      assert.deepEqual(linkedIds, [String(childB)]);
      assert.ok(!linkedIds.includes(String(childA)));
      const linkedChildren = primaryInSiblingView.linked_children || [];
      assert.ok(linkedChildren.every((row) => String(row.child_id || row.id) === String(childB)));

      const primaryFamily = await getFamily(http.baseUrl, primary);
      assert.equal(primaryFamily.res.status, 200, primaryFamily.text);
      const primaryPending = primaryFamily.json.pendingInvites || [];
      assert.ok(inviteByEmail(primaryPending, emailIA));
      assert.deepEqual(
        (inviteByEmail(primaryPending, emailIA).child_ids || []).map(String).sort(),
        [String(childA)]
      );
      assert.ok(inviteByEmail(primaryPending, emailIB));
      assert.deepEqual(
        (inviteByEmail(primaryPending, emailIAB).child_ids || []).map(String).sort(),
        [String(childA), String(childB)].sort()
      );
      assert.ok(inviteByEmail(primaryPending, emailIAll));

      await db.query(
        `UPDATE parent_child SET revoked_at = NOW() WHERE parent_id = $1 AND child_id = $2`,
        [siblingId, childB]
      );
      const afterRevoke = await getFamily(http.baseUrl, sibling);
      assert.equal(afterRevoke.res.status, 200, afterRevoke.text);
      const afterPending = afterRevoke.json.pendingInvites || [];
      assert.equal(inviteByEmail(afterPending, emailIA), null);
      assert.equal(inviteByEmail(afterPending, emailIB), null);
      assert.equal(inviteByEmail(afterPending, emailIAB), null);
      assert.ok(inviteByEmail(afterPending, emailIAll), 'family-wide invite remains after revoke');
      assert.ok(!afterRevoke.text.includes(emailIA));
      assert.ok(!afterRevoke.text.includes(childA));
      assert.ok(!afterRevoke.text.includes(emailIB));
      assert.ok(!afterRevoke.text.includes(childB), 'revoked child id must leave the payload');

      const outsider = await registerAndLogin(http.baseUrl, { name: 'D2 Outsider' });
      const outsiderFamily = await getFamily(http.baseUrl, outsider);
      assert.equal(outsiderFamily.res.status, 200, outsiderFamily.text);
      assert.ok(!outsiderFamily.text.includes(emailIA));
      assert.ok(!outsiderFamily.text.includes(emailIB));
      assert.ok(!outsiderFamily.text.includes(emailIAB));
      assert.ok(!outsiderFamily.text.includes(childA));
      assert.ok(!outsiderFamily.text.includes(childB));
      assert.equal((outsiderFamily.json.pendingInvites || []).length, 0);

      assert.ok(inviteIA.id && inviteIB.id && inviteIAB.id && inviteIAll.id);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
