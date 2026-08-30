'use strict';

/**
 * P0.2 — child deletion authorization (adversarial integration).
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
const childDeletion = require('../src/lib/child-deletion');
const avatarStorage = require('../src/lib/avatar-storage');

const ROOT = path.join(__dirname, '..');
const FAMILY_PATH = '/api/family/children';
const CHILDREN_PATH = '/api/children';

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

async function deleteChild(baseUrl, session, childId, apiBase) {
  return fetch(`${baseUrl}${apiBase}/${childId}`, {
    method: 'DELETE',
    headers: {
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
  });
}

async function inviteAndAcceptCoParent(baseUrl, db, primary, childId) {
  const coparentEmail = `coparent-p02-${Date.now()}@example.com`;
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

async function lookupFamilyId(db, email) {
  const row = await db.query(
    'SELECT family_id FROM parent WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  );
  return row.rows[0]?.family_id;
}

async function lookupParentId(db, email) {
  const row = await db.query(
    'SELECT id FROM parent WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  );
  return row.rows[0]?.id;
}

async function childStateSnapshot(db, childId) {
  const [child, links, logs, streaks, redemptions, weekly, special, notes] = await Promise.all([
    db.query('SELECT id, family_id FROM child WHERE id = $1', [childId]),
    db.query(
      `SELECT parent_id, role, revoked_at IS NOT NULL AS revoked
       FROM parent_child WHERE child_id = $1 ORDER BY parent_id`,
      [childId]
    ),
    db.query('SELECT COUNT(*)::int AS n FROM daily_log WHERE child_id = $1', [childId]),
    db.query('SELECT COUNT(*)::int AS n FROM streak WHERE child_id = $1', [childId]),
    db.query('SELECT COUNT(*)::int AS n FROM reward_redemption WHERE child_id = $1', [childId]),
    db.query('SELECT COUNT(*)::int AS n FROM weekly_schedule WHERE child_id = $1', [childId]),
    db.query('SELECT COUNT(*)::int AS n FROM special_day_schedule WHERE child_id = $1', [childId]),
    db.query('SELECT COUNT(*)::int AS n FROM parent_note WHERE child_id = $1', [childId]),
  ]);
  return {
    exists: child.rows.length > 0,
    familyId: child.rows[0]?.family_id || null,
    links: links.rows,
    dailyLogs: logs.rows[0].n,
    streaks: streaks.rows[0].n,
    redemptions: redemptions.rows[0].n,
    weekly: weekly.rows[0].n,
    special: special.rows[0].n,
    notes: notes.rows[0].n,
  };
}

async function familyMemberSnapshot(db, familyId) {
  const [family, parents, children] = await Promise.all([
    db.query('SELECT id FROM family WHERE id = $1', [familyId]),
    db.query('SELECT id FROM parent WHERE family_id = $1 ORDER BY id', [familyId]),
    db.query('SELECT id FROM child WHERE family_id = $1 ORDER BY id', [familyId]),
  ]);
  return {
    familyExists: family.rows.length > 0,
    parentIds: parents.rows.map((r) => r.id),
    childIds: children.rows.map((r) => r.id),
  };
}

async function insertPendingFamilyInvite(db, { familyId, email, childIds, accepted = false }) {
  const token = `p02-fi-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const row = await db.query(
    `INSERT INTO family_invite (family_id, email, child_ids, token, expires_at, accepted, invitee_name)
     VALUES ($1, $2, $3::uuid[], $4, NOW() + INTERVAL '7 days', $5, 'Invitee')
     RETURNING id, token, child_ids, accepted`,
    [familyId, email.toLowerCase(), childIds, token, accepted]
  );
  return row.rows[0];
}

async function insertPendingPedagogInvite(db, { familyId, inviterParentId, email, childIds }) {
  const token = `p02-pi-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const row = await db.query(
    `INSERT INTO pedagog_invite
       (family_id, inviter_parent_id, email, invitee_name, child_ids, token, expires_at, accepted)
     VALUES ($1, $2, $3, 'Pedagog Invitee', $4::uuid[], $5, NOW() + INTERVAL '7 days', false)
     RETURNING id, token, child_ids, accepted`,
    [familyId, inviterParentId, email.toLowerCase(), childIds, token]
  );
  return row.rows[0];
}

function sortedIds(ids) {
  return [...(ids || [])].map(String).sort();
}

async function seedChildDependents(db, childId) {
  await db.query(
    `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE)
     ON CONFLICT (child_id, date) DO NOTHING`,
    [childId]
  );
  await db.query(
    `INSERT INTO streak (child_id, current_streak, cycle_day)
     VALUES ($1, 1, 1)
     ON CONFLICT (child_id) DO NOTHING`,
    [childId]
  );
  await db.query(
    `INSERT INTO parent_note (child_id, content) VALUES ($1, 'p02-note')`,
    [childId]
  );
}

async function createPedagogSession(http, db, familyId, childId) {
  const tag = `ped-p02-${Date.now()}`;
  const password = `pw-${tag}`;
  const passwordHash = await hashPassword(password);
  const email = `pedagog-${tag}@example.com`;
  await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed, account_type)
     VALUES ($1, $2, $3, 'Pedagog', true, true, 'educator')`,
    [email, passwordHash, familyId]
  );
  const pedagogId = await lookupParentId(db, email);
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'pedagog')`,
    [pedagogId, childId]
  );
  const session = await loginByEmail(http.baseUrl, email, password);
  return { session, pedagogId, email };
}

describe('P0.2 child deletion routing', () => {
  test('classifier treats child-deletion files as R3 with L3 required', () => {
    const plan = routeChangedFiles(ROOT, {
      files: [
        'src/lib/child-deletion.js',
        'src/routes/family/members.js',
        'src/routes/children.js',
      ],
    });
    assert.equal(plan.riskClass, 'R3');
    assert.equal(plan.verificationPlan.L3.required, true);
  });
});

describe('P0.2 child deletion authorization', () => {
  for (const apiBase of [FAMILY_PATH, CHILDREN_PATH]) {
    describe(apiBase, () => {
      test('active primary deletes own target child', async (t) => {
        const db = await setupTestDb();
        if (db.skip) return t.skip('No real DATABASE_URL');
        let http;
        try {
          const { createApp } = require('../app');
          http = await listenApp(createApp);
          const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
          const familyId = await lookupFamilyId(db, primary.email);
          const targetId = await createChild(http.baseUrl, primary, { name: 'Target', emoji: '🌟' });
          const siblingId = await createChild(http.baseUrl, primary, { name: 'Sibling', emoji: '⭐' });
          await seedChildDependents(db, targetId);
          await seedChildDependents(db, siblingId);
          const beforeSibling = await childStateSnapshot(db, siblingId);
          const beforeFamily = await familyMemberSnapshot(db, familyId);

          const delRes = await deleteChild(http.baseUrl, primary, targetId, apiBase);
          assert.equal(delRes.status, 200, await delRes.text());

          const afterTarget = await childStateSnapshot(db, targetId);
          const afterSibling = await childStateSnapshot(db, siblingId);
          const afterFamily = await familyMemberSnapshot(db, familyId);
          assert.equal(afterTarget.exists, false);
          assert.equal(afterTarget.dailyLogs, 0);
          assert.equal(afterTarget.streaks, 0);
          assert.equal(afterTarget.notes, 0);
          assert.deepEqual(afterSibling, beforeSibling);
          assert.equal(afterFamily.familyExists, true);
          assert.deepEqual(afterFamily.parentIds, beforeFamily.parentIds);
          assert.ok(afterFamily.childIds.includes(siblingId));
          assert.ok(!afterFamily.childIds.includes(targetId));
        } finally {
          if (http) await http.close();
          await db.cleanup();
        }
      });

      test('active shared denied with identical DB state', async (t) => {
        const db = await setupTestDb();
        if (db.skip) return t.skip('No real DATABASE_URL');
        let http;
        try {
          const { createApp } = require('../app');
          http = await listenApp(createApp);
          const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
          const familyId = await lookupFamilyId(db, primary.email);
          const childId = await createChild(http.baseUrl, primary, { name: 'Kid', emoji: '⭐' });
          await seedChildDependents(db, childId);
          const shared = await inviteAndAcceptCoParent(http.baseUrl, db, primary, childId);
          const role = await db.query(
            'SELECT role FROM parent_child WHERE parent_id = $1 AND child_id = $2',
            [await lookupParentId(db, shared.email), childId]
          );
          assert.equal(role.rows[0].role, 'shared');
          const beforeChild = await childStateSnapshot(db, childId);
          const beforeFamily = await familyMemberSnapshot(db, familyId);
          const delRes = await deleteChild(http.baseUrl, shared, childId, apiBase);
          assert.equal(delRes.status, 403, await delRes.text());
          assert.deepEqual(await childStateSnapshot(db, childId), beforeChild);
          assert.deepEqual(await familyMemberSnapshot(db, familyId), beforeFamily);
        } finally {
          if (http) await http.close();
          await db.cleanup();
        }
      });

      test('pedagog denied with identical DB state', async (t) => {
        const db = await setupTestDb();
        if (db.skip) return t.skip('No real DATABASE_URL');
        let http;
        try {
          const { createApp } = require('../app');
          http = await listenApp(createApp);
          const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
          const familyId = await lookupFamilyId(db, primary.email);
          const childId = await createChild(http.baseUrl, primary, { name: 'Kid', emoji: '⭐' });
          await seedChildDependents(db, childId);
          const pedagog = await createPedagogSession(http, db, familyId, childId);
          const beforeChild = await childStateSnapshot(db, childId);
          const beforeFamily = await familyMemberSnapshot(db, familyId);
          const delRes = await deleteChild(http.baseUrl, pedagog.session, childId, apiBase);
          assert.ok(delRes.status === 403, await delRes.text());
          assert.deepEqual(await childStateSnapshot(db, childId), beforeChild);
          assert.deepEqual(await familyMemberSnapshot(db, familyId), beforeFamily);
        } finally {
          if (http) await http.close();
          await db.cleanup();
        }
      });

      test('revoked former primary denied with identical DB state', async (t) => {
        const db = await setupTestDb();
        if (db.skip) return t.skip('No real DATABASE_URL');
        let http;
        try {
          const { createApp } = require('../app');
          http = await listenApp(createApp);
          const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
          const familyId = await lookupFamilyId(db, primary.email);
          const childId = await createChild(http.baseUrl, primary, { name: 'Kid', emoji: '⭐' });
          const stay = await inviteAndAcceptCoParent(http.baseUrl, db, primary, childId);
          await db.query(
            `UPDATE parent_child SET role = 'primary' WHERE parent_id = $1 AND child_id = $2`,
            [await lookupParentId(db, stay.email), childId]
          );
          const primaryId = await lookupParentId(db, primary.email);
          await db.query(
            `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $2 WHERE parent_id = $1 AND child_id = $3`,
            [primaryId, await lookupParentId(db, stay.email), childId]
          );
          await seedChildDependents(db, childId);
          const beforeChild = await childStateSnapshot(db, childId);
          const beforeFamily = await familyMemberSnapshot(db, familyId);
          const delRes = await deleteChild(http.baseUrl, primary, childId, apiBase);
          assert.equal(delRes.status, 403, await delRes.text());
          assert.deepEqual(await childStateSnapshot(db, childId), beforeChild);
          assert.deepEqual(await familyMemberSnapshot(db, familyId), beforeFamily);
        } finally {
          if (http) await http.close();
          await db.cleanup();
        }
      });

      test('primary for child A cannot delete child B', async (t) => {
        const db = await setupTestDb();
        if (db.skip) return t.skip('No real DATABASE_URL');
        let http;
        try {
          const { createApp } = require('../app');
          http = await listenApp(createApp);
          const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
          const familyId = await lookupFamilyId(db, primary.email);
          const childA = await createChild(http.baseUrl, primary, { name: 'A', emoji: '🅰️' });
          const childB = await createChild(http.baseUrl, primary, { name: 'B', emoji: '🅱️' });
          const other = await inviteAndAcceptCoParent(http.baseUrl, db, primary, childA);
          await db.query(
            `UPDATE parent_child SET role = 'primary' WHERE parent_id = $1 AND child_id = $2`,
            [await lookupParentId(db, other.email), childA]
          );
          await seedChildDependents(db, childB);
          const beforeB = await childStateSnapshot(db, childB);
          const delRes = await deleteChild(http.baseUrl, other, childB, apiBase);
          assert.equal(delRes.status, 403, await delRes.text());
          assert.deepEqual(await childStateSnapshot(db, childB), beforeB);
          assert.equal((await familyMemberSnapshot(db, familyId)).childIds.includes(childA), true);
        } finally {
          if (http) await http.close();
          await db.cleanup();
        }
      });
    });
  }

  test('unrelated same-family adult with no target link is denied', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
      const familyId = await lookupFamilyId(db, primary.email);
      const childId = await createChild(http.baseUrl, primary, { name: 'Kid', emoji: '⭐' });
      const tag = `nolink-p02-${Date.now()}`;
      const password = `pw-${tag}`;
      const email = `nolink-${tag}@example.com`;
      await db.query(
        `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed, account_type)
         VALUES ($1, $2, $3, 'No Link', true, true, 'family')`,
        [email, await hashPassword(password), familyId]
      );
      const session = await loginByEmail(http.baseUrl, email, password);
      await seedChildDependents(db, childId);
      const beforeChild = await childStateSnapshot(db, childId);
      const beforeFamily = await familyMemberSnapshot(db, familyId);
      for (const apiBase of [FAMILY_PATH, CHILDREN_PATH]) {
        const delRes = await deleteChild(http.baseUrl, session, childId, apiBase);
        assert.equal(delRes.status, 403, await delRes.text());
        assert.deepEqual(await childStateSnapshot(db, childId), beforeChild);
        assert.deepEqual(await familyMemberSnapshot(db, familyId), beforeFamily);
      }
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('cross-family target is not found and neither family mutates', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const familyA = await registerAndLogin(http.baseUrl, { name: 'Family A' });
      const familyB = await registerAndLogin(http.baseUrl, { name: 'Family B' });
      const familyAId = await lookupFamilyId(db, familyA.email);
      const familyBId = await lookupFamilyId(db, familyB.email);
      const childA = await createChild(http.baseUrl, familyA, { name: 'A', emoji: '🅰️' });
      const childB = await createChild(http.baseUrl, familyB, { name: 'B', emoji: '🅱️' });
      await seedChildDependents(db, childA);
      await seedChildDependents(db, childB);
      const beforeA = await childStateSnapshot(db, childA);
      const beforeB = await childStateSnapshot(db, childB);
      const beforeFamA = await familyMemberSnapshot(db, familyAId);
      const beforeFamB = await familyMemberSnapshot(db, familyBId);
      for (const apiBase of [FAMILY_PATH, CHILDREN_PATH]) {
        const delRes = await deleteChild(http.baseUrl, familyA, childB, apiBase);
        assert.ok(delRes.status === 403 || delRes.status === 404, await delRes.text());
        assert.deepEqual(await childStateSnapshot(db, childA), beforeA);
        assert.deepEqual(await childStateSnapshot(db, childB), beforeB);
        assert.deepEqual(await familyMemberSnapshot(db, familyAId), beforeFamA);
        assert.deepEqual(await familyMemberSnapshot(db, familyBId), beforeFamB);
      }
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('child session cannot delete', async (t) => {
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
      const before = await childStateSnapshot(db, childId);
      const beforeFamily = await familyMemberSnapshot(db, familyId);
      for (const apiBase of [FAMILY_PATH, CHILDREN_PATH]) {
        const delRes = await fetch(`${http.baseUrl}${apiBase}/${childId}`, {
          method: 'DELETE',
          headers: { Cookie: cookieHeader(childCookies) },
        });
        assert.ok(delRes.status === 401 || delRes.status === 403, await delRes.text());
        assert.deepEqual(await childStateSnapshot(db, childId), before);
        assert.deepEqual(await familyMemberSnapshot(db, familyId), beforeFamily);
      }
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('unauthenticated delete is denied with zero mutation', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const parent = await registerAndLogin(http.baseUrl, { name: 'Parent' });
      const familyId = await lookupFamilyId(db, parent.email);
      const childId = await createChild(http.baseUrl, parent, { name: 'Kid', emoji: '⭐' });
      const before = await childStateSnapshot(db, childId);
      const beforeFamily = await familyMemberSnapshot(db, familyId);
      for (const apiBase of [FAMILY_PATH, CHILDREN_PATH]) {
        const delRes = await fetch(`${http.baseUrl}${apiBase}/${childId}`, { method: 'DELETE' });
        assert.ok(delRes.status === 401 || delRes.status === 403, await delRes.text());
        assert.deepEqual(await childStateSnapshot(db, childId), before);
        assert.deepEqual(await familyMemberSnapshot(db, familyId), beforeFamily);
      }
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });
});

describe('P0.2 child deletion avatar + concurrency', () => {
  test('success captures child key and deletes that object after COMMIT', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    const deleted = [];
    const origDelete = avatarStorage.deletePrivateObject;
    avatarStorage.deletePrivateObject = async (key) => {
      deleted.push(key);
    };
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'Avatar' });
      const childId = await createChild(http.baseUrl, primary, { name: 'AvatarKid', emoji: '🌟' });
      const siblingId = await createChild(http.baseUrl, primary, { name: 'Stay', emoji: '⭐' });
      const childKey = `avatars-private/p02-child-${childId}.jpg`;
      const siblingKey = `avatars-private/p02-sibling-${siblingId}.jpg`;
      await db.query('UPDATE child SET avatar_storage_key = $2 WHERE id = $1', [childId, childKey]);
      await db.query('UPDATE child SET avatar_storage_key = $2 WHERE id = $1', [siblingId, siblingKey]);
      const captured = await childDeletion.collectChildAvatarStorageKey(db, childId);
      assert.equal(captured, childKey);
      const delRes = await deleteChild(http.baseUrl, primary, childId, FAMILY_PATH);
      assert.equal(delRes.status, 200, await delRes.text());
      assert.equal((await childStateSnapshot(db, childId)).exists, false);
      assert.equal((await childStateSnapshot(db, siblingId)).exists, true);
      assert.deepEqual(deleted, [childKey]);
    } finally {
      avatarStorage.deletePrivateObject = origDelete;
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('rollback after key capture does not delete storage objects', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    const deleted = [];
    const origDelete = avatarStorage.deletePrivateObject;
    const origHardDelete = childDeletion.hardDeleteChildData;
    avatarStorage.deletePrivateObject = async (key) => {
      deleted.push(key);
    };
    childDeletion.hardDeleteChildData = async () => {
      throw new Error('forced child delete failure');
    };
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'Rollback' });
      const childId = await createChild(http.baseUrl, primary, { name: 'Keep', emoji: '🌟' });
      const childKey = `avatars-private/p02-rollback-${childId}.jpg`;
      await db.query('UPDATE child SET avatar_storage_key = $2 WHERE id = $1', [childId, childKey]);
      await seedChildDependents(db, childId);
      const before = await childStateSnapshot(db, childId);
      const captured = await childDeletion.collectChildAvatarStorageKey(db, childId);
      assert.equal(captured, childKey);
      const delRes = await deleteChild(http.baseUrl, primary, childId, CHILDREN_PATH);
      assert.equal(delRes.status, 500, await delRes.text());
      assert.deepEqual(await childStateSnapshot(db, childId), before);
      assert.deepEqual(deleted, []);
    } finally {
      avatarStorage.deletePrivateObject = origDelete;
      childDeletion.hardDeleteChildData = origHardDelete;
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('concurrent revoke cannot let stale primary delete', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'Race' });
      const familyId = await lookupFamilyId(db, primary.email);
      const childId = await createChild(http.baseUrl, primary, { name: 'Kid', emoji: '⭐' });
      const stay = await inviteAndAcceptCoParent(http.baseUrl, db, primary, childId);
      await db.query(
        `UPDATE parent_child SET role = 'primary' WHERE parent_id = $1 AND child_id = $2`,
        [await lookupParentId(db, stay.email), childId]
      );
      const primaryId = await lookupParentId(db, primary.email);

      const revokeFn = async () => {
        const client = await db.pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('SELECT id FROM child WHERE id = $1 FOR UPDATE', [childId]);
          await client.query(
            `SELECT parent_id, child_id FROM parent_child
             WHERE child_id = $1 ORDER BY child_id, parent_id FOR UPDATE`,
            [childId]
          );
          await client.query(
            `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $2
             WHERE parent_id = $1 AND child_id = $3 AND revoked_at IS NULL`,
            [primaryId, await lookupParentId(db, stay.email), childId]
          );
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {});
          throw err;
        } finally {
          client.release();
        }
      };

      const [delRes] = await Promise.all([
        deleteChild(http.baseUrl, primary, childId, FAMILY_PATH),
        revokeFn(),
      ]);
      const delText = await delRes.text();
      const after = await childStateSnapshot(db, childId);
      if (after.exists) {
        assert.notEqual(delRes.status, 200, delText);
        const revoked = after.links.find((link) => link.parent_id === primaryId);
        assert.ok(revoked && revoked.revoked, JSON.stringify(after.links));
      } else {
        assert.equal(delRes.status, 200, delText);
      }
      assert.equal((await familyMemberSnapshot(db, familyId)).familyExists, true);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('duplicate concurrent DELETE leaves one complete deletion', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const familyA = await registerAndLogin(http.baseUrl, { name: 'Dup A' });
      const familyB = await registerAndLogin(http.baseUrl, { name: 'Dup B' });
      const familyAId = await lookupFamilyId(db, familyA.email);
      const familyBId = await lookupFamilyId(db, familyB.email);
      const childA = await createChild(http.baseUrl, familyA, { name: 'A', emoji: '🅰️' });
      const childB = await createChild(http.baseUrl, familyB, { name: 'B', emoji: '🅱️' });
      await seedChildDependents(db, childA);
      await seedChildDependents(db, childB);
      const beforeB = await childStateSnapshot(db, childB);
      const beforeFamB = await familyMemberSnapshot(db, familyBId);

      const [firstRes, secondRes] = await Promise.all([
        deleteChild(http.baseUrl, familyA, childA, FAMILY_PATH),
        deleteChild(http.baseUrl, familyA, childA, CHILDREN_PATH),
      ]);
      const statuses = [firstRes.status, secondRes.status].sort();
      assert.ok(statuses.includes(200), `${firstRes.status} ${await firstRes.text()} ${secondRes.status} ${await secondRes.text()}`);
      assert.ok(
        statuses.every((status) => status === 200 || status === 404 || status === 403),
        `unexpected statuses ${statuses}`
      );
      assert.equal((await childStateSnapshot(db, childA)).exists, false);
      assert.deepEqual(await childStateSnapshot(db, childB), beforeB);
      assert.deepEqual(await familyMemberSnapshot(db, familyBId), beforeFamB);
      assert.equal((await familyMemberSnapshot(db, familyAId)).familyExists, true);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });
});

describe('P0.2 pending invite child_ids integrity', () => {
  test('family invite with [A, B] keeps B only and acceptance grants B only', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'InviteMulti' });
      const familyId = await lookupFamilyId(db, primary.email);
      const childA = await createChild(http.baseUrl, primary, { name: 'A', emoji: '🅰️' });
      const childB = await createChild(http.baseUrl, primary, { name: 'B', emoji: '🅱️' });
      const inviteEmail = `fam-multi-${Date.now()}@example.com`;
      const invite = await insertPendingFamilyInvite(db, {
        familyId,
        email: inviteEmail,
        childIds: [childA, childB],
      });
      const stayInvite = await insertPendingFamilyInvite(db, {
        familyId,
        email: `fam-stay-${Date.now()}@example.com`,
        childIds: [childB],
      });

      const delRes = await deleteChild(http.baseUrl, primary, childA, FAMILY_PATH);
      assert.equal(delRes.status, 200, await delRes.text());
      assert.equal((await childStateSnapshot(db, childA)).exists, false);
      assert.equal((await childStateSnapshot(db, childB)).exists, true);

      const after = await db.query(
        'SELECT id, child_ids, accepted FROM family_invite WHERE id = $1',
        [invite.id]
      );
      assert.equal(after.rows.length, 1);
      assert.equal(after.rows[0].accepted, false);
      assert.deepEqual(sortedIds(after.rows[0].child_ids), [childB]);
      const stay = await db.query('SELECT child_ids FROM family_invite WHERE id = $1', [stayInvite.id]);
      assert.deepEqual(sortedIds(stay.rows[0].child_ids), [childB]);

      const acceptRes = await fetch(`${http.baseUrl}/api/family/invite/accept-new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invite.token, password: 'coparent-pass-12' }),
      });
      assert.equal(acceptRes.status, 201, await acceptRes.text());
      const newParentId = await lookupParentId(db, inviteEmail);
      const links = await db.query(
        `SELECT child_id, role, revoked_at IS NOT NULL AS revoked
         FROM parent_child WHERE parent_id = $1 ORDER BY child_id`,
        [newParentId]
      );
      assert.deepEqual(links.rows.map((r) => r.child_id), [childB]);
      assert.ok(links.rows.every((r) => !r.revoked));
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('family invite with only deleted child is removed and cannot expand to all children', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'InviteSolo' });
      const familyId = await lookupFamilyId(db, primary.email);
      const childA = await createChild(http.baseUrl, primary, { name: 'A', emoji: '🅰️' });
      const childB = await createChild(http.baseUrl, primary, { name: 'B', emoji: '🅱️' });
      const inviteEmail = `fam-solo-${Date.now()}@example.com`;
      const invite = await insertPendingFamilyInvite(db, {
        familyId,
        email: inviteEmail,
        childIds: [childA],
      });

      const delRes = await deleteChild(http.baseUrl, primary, childA, CHILDREN_PATH);
      assert.equal(delRes.status, 200, await delRes.text());

      const leftover = await db.query(
        'SELECT id, child_ids, accepted FROM family_invite WHERE id = $1 OR token = $2',
        [invite.id, invite.token]
      );
      assert.equal(leftover.rows.length, 0);
      const emptyPending = await db.query(
        `SELECT id FROM family_invite
         WHERE family_id = $1 AND accepted = false AND COALESCE(cardinality(child_ids), 0) = 0`,
        [familyId]
      );
      assert.equal(emptyPending.rows.length, 0);

      const acceptRes = await fetch(`${http.baseUrl}/api/family/invite/accept-new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invite.token, password: 'coparent-pass-12' }),
      });
      assert.ok(acceptRes.status === 404 || acceptRes.status === 400, await acceptRes.text());
      const sneakyParent = await db.query(
        'SELECT id FROM parent WHERE LOWER(email) = $1',
        [inviteEmail]
      );
      assert.equal(sneakyParent.rows.length, 0);
      const bLinks = await db.query(
        'SELECT parent_id FROM parent_child WHERE child_id = $1',
        [childB]
      );
      const primaryId = await lookupParentId(db, primary.email);
      assert.deepEqual(bLinks.rows.map((r) => r.parent_id), [primaryId]);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('pedagog invite with [A, B] keeps B only', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'PedMulti' });
      const familyId = await lookupFamilyId(db, primary.email);
      const primaryId = await lookupParentId(db, primary.email);
      const childA = await createChild(http.baseUrl, primary, { name: 'A', emoji: '🅰️' });
      const childB = await createChild(http.baseUrl, primary, { name: 'B', emoji: '🅱️' });
      const invite = await insertPendingPedagogInvite(db, {
        familyId,
        inviterParentId: primaryId,
        email: `ped-multi-${Date.now()}@example.com`,
        childIds: [childA, childB],
      });

      const delRes = await deleteChild(http.baseUrl, primary, childA, FAMILY_PATH);
      assert.equal(delRes.status, 200, await delRes.text());

      const after = await db.query(
        'SELECT id, child_ids, accepted FROM pedagog_invite WHERE id = $1',
        [invite.id]
      );
      assert.equal(after.rows.length, 1);
      assert.equal(after.rows[0].accepted, false);
      assert.deepEqual(sortedIds(after.rows[0].child_ids), [childB]);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('pedagog invite with only deleted child is removed', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'PedSolo' });
      const familyId = await lookupFamilyId(db, primary.email);
      const primaryId = await lookupParentId(db, primary.email);
      const childA = await createChild(http.baseUrl, primary, { name: 'A', emoji: '🅰️' });
      await createChild(http.baseUrl, primary, { name: 'B', emoji: '🅱️' });
      const invite = await insertPendingPedagogInvite(db, {
        familyId,
        inviterParentId: primaryId,
        email: `ped-solo-${Date.now()}@example.com`,
        childIds: [childA],
      });

      const delRes = await deleteChild(http.baseUrl, primary, childA, CHILDREN_PATH);
      assert.equal(delRes.status, 200, await delRes.text());

      const leftover = await db.query(
        'SELECT id, child_ids FROM pedagog_invite WHERE id = $1 OR token = $2',
        [invite.id, invite.token]
      );
      assert.equal(leftover.rows.length, 0);
      const emptyPending = await db.query(
        `SELECT id FROM pedagog_invite
         WHERE family_id = $1 AND accepted = false AND COALESCE(cardinality(child_ids), 0) = 0`,
        [familyId]
      );
      assert.equal(emptyPending.rows.length, 0);
    } finally {
      if (http) await http.close();
      await db.cleanup();
    }
  });

  test('rollback after invite cleanup leaves invites and child unchanged', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    let http;
    const deleted = [];
    const origDelete = avatarStorage.deletePrivateObject;
    const origHardDelete = childDeletion.hardDeleteChildData;
    avatarStorage.deletePrivateObject = async (key) => {
      deleted.push(key);
    };
    childDeletion.hardDeleteChildData = async () => {
      throw new Error('forced child delete failure after invite cleanup');
    };
    try {
      const { createApp } = require('../app');
      http = await listenApp(createApp);
      const primary = await registerAndLogin(http.baseUrl, { name: 'InviteRollback' });
      const familyId = await lookupFamilyId(db, primary.email);
      const primaryId = await lookupParentId(db, primary.email);
      const childA = await createChild(http.baseUrl, primary, { name: 'A', emoji: '🅰️' });
      const childB = await createChild(http.baseUrl, primary, { name: 'B', emoji: '🅱️' });
      const childKey = `avatars-private/p02-invite-rollback-${childA}.jpg`;
      await db.query('UPDATE child SET avatar_storage_key = $2 WHERE id = $1', [childA, childKey]);
      const familyInvite = await insertPendingFamilyInvite(db, {
        familyId,
        email: `fam-rb-${Date.now()}@example.com`,
        childIds: [childA, childB],
      });
      const pedagogInvite = await insertPendingPedagogInvite(db, {
        familyId,
        inviterParentId: primaryId,
        email: `ped-rb-${Date.now()}@example.com`,
        childIds: [childA],
      });
      const beforeFamily = await db.query(
        'SELECT id, child_ids, accepted FROM family_invite WHERE id = $1',
        [familyInvite.id]
      );
      const beforePedagog = await db.query(
        'SELECT id, child_ids, accepted FROM pedagog_invite WHERE id = $1',
        [pedagogInvite.id]
      );
      const beforeChild = await childStateSnapshot(db, childA);

      const delRes = await deleteChild(http.baseUrl, primary, childA, FAMILY_PATH);
      assert.equal(delRes.status, 500, await delRes.text());
      assert.deepEqual(await childStateSnapshot(db, childA), beforeChild);
      const afterFamily = await db.query(
        'SELECT id, child_ids, accepted FROM family_invite WHERE id = $1',
        [familyInvite.id]
      );
      const afterPedagog = await db.query(
        'SELECT id, child_ids, accepted FROM pedagog_invite WHERE id = $1',
        [pedagogInvite.id]
      );
      assert.deepEqual(sortedIds(afterFamily.rows[0].child_ids), sortedIds(beforeFamily.rows[0].child_ids));
      assert.equal(afterFamily.rows[0].accepted, beforeFamily.rows[0].accepted);
      assert.deepEqual(sortedIds(afterPedagog.rows[0].child_ids), sortedIds(beforePedagog.rows[0].child_ids));
      assert.equal(afterPedagog.rows.length, 1);
      assert.deepEqual(deleted, []);
    } finally {
      avatarStorage.deletePrivateObject = origDelete;
      childDeletion.hardDeleteChildData = origHardDelete;
      if (http) await http.close();
      await db.cleanup();
    }
  });
});

describe('P0.2 static contracts', () => {
  test('both DELETE routes use the canonical helper and post-COMMIT cleanup', () => {
    const familySrc = fs.readFileSync(path.join(ROOT, 'src/routes/family/members.js'), 'utf8');
    const childrenSrc = fs.readFileSync(path.join(ROOT, 'src/routes/children.js'), 'utf8');
    const helperSrc = fs.readFileSync(path.join(ROOT, 'src/lib/child-deletion.js'), 'utf8');
    for (const src of [familySrc, childrenSrc]) {
      assert.match(src, /performChildDeletionInTransaction/);
      assert.match(src, /cleanupAvatarStorageKeysAfterCommit/);
      assert.doesNotMatch(src, /deleteAvatarForChildRecord/);
    }
    assert.match(helperSrc, /collectChildAvatarStorageKey/);
    assert.match(helperSrc, /cleanupPendingInviteChildRefs/);
    assert.match(helperSrc, /hardDeleteChildData/);
    assert.match(helperSrc, /revoked_at IS NULL/);
    assert.match(helperSrc, /role = 'primary'/);
    const performSrc = helperSrc.slice(helperSrc.indexOf('async function performChildDeletionInTransaction'));
    const collectIdx = performSrc.indexOf('collectChildAvatarStorageKey');
    const inviteIdx = performSrc.indexOf('cleanupPendingInviteChildRefs');
    const deleteIdx = performSrc.indexOf('hardDeleteChildData');
    const commitIdx = performSrc.indexOf("await client.query('COMMIT')");
    assert.ok(collectIdx > 0 && inviteIdx > collectIdx && deleteIdx > inviteIdx);
    assert.ok(commitIdx > deleteIdx);
  });

  test('live UI hides delete unless existing payload role is primary', () => {
    const profileSetup = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-setup.js'), 'utf8');
    const profile = fs.readFileSync(path.join(ROOT, 'public/js/child-profile.js'), 'utf8');
    const settings = fs.readFileSync(path.join(ROOT, 'public/js/child-settings.js'), 'utf8');
    const family = fs.readFileSync(path.join(ROOT, 'public/js/family.js'), 'utf8');
    assert.match(profileSetup, /child\.role === 'primary'/);
    assert.match(profile, /childRow\.role !== 'primary'/);
    assert.match(settings, /child\.role !== 'primary'/);
    assert.match(family, /child\.role !== 'primary'/);
  });
});
