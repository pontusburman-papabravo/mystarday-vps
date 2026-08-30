'use strict';

/**
 * P0.3 — child-scoped push recipients.
 * Child-event pushes must only go to parents with an active parent_child link.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { hashPassword } = require('../src/lib/hash');
const { loadLocales } = require('../src/lib/i18n');
const push = require('../src/lib/push');
const pushNotifications = require('../src/lib/push-notifications');
const { routeChangedFiles } = require('../scripts/lib/test-routing/route.mjs');

loadLocales();

const ROOT = path.join(__dirname, '..');
const PUSH_ON = { enabled: true };

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function insertParent(db, { familyId, email, name, prefs = PUSH_ON }) {
  const passwordHash = await hashPassword('p03-push-pass-12');
  const row = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed, push_preferences)
     VALUES ($1, $2, $3, $4, true, true, $5::jsonb)
     RETURNING id`,
    [email, passwordHash, familyId, name, JSON.stringify(prefs)]
  );
  return row.rows[0].id;
}

async function seedFamily(db) {
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const family = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free)
     VALUES ($1, 'Europe/Stockholm', true) RETURNING id`,
    [`P03 Push ${tag}`]
  );
  const familyId = family.rows[0].id;
  const childA = await db.query(
    `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'A', '🅰️', $2) RETURNING id`,
    [familyId, `p03a-${tag}`]
  );
  const childB = await db.query(
    `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'B', '🅱️', $2) RETURNING id`,
    [familyId, `p03b-${tag}`]
  );
  const childAId = childA.rows[0].id;
  const childBId = childB.rows[0].id;

  const primaryId = await insertParent(db, {
    familyId,
    email: `p03-primary-${tag}@example.com`,
    name: 'Primary',
  });
  const sharedOnAId = await insertParent(db, {
    familyId,
    email: `p03-shared-a-${tag}@example.com`,
    name: 'SharedA',
  });
  const sharedOnBOnlyId = await insertParent(db, {
    familyId,
    email: `p03-shared-b-${tag}@example.com`,
    name: 'SharedB',
  });
  const revokedOnAId = await insertParent(db, {
    familyId,
    email: `p03-revoked-${tag}@example.com`,
    name: 'RevokedA',
  });
  const pedagogOnAId = await insertParent(db, {
    familyId,
    email: `p03-pedagog-${tag}@example.com`,
    name: 'PedagogA',
  });
  const unlinkedId = await insertParent(db, {
    familyId,
    email: `p03-unlinked-${tag}@example.com`,
    name: 'Unlinked',
  });

  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES
       ($1, $2, 'primary'),
       ($3, $2, 'shared'),
       ($4, $5, 'shared'),
       ($6, $2, 'shared'),
       ($7, $2, 'pedagog')`,
    [primaryId, childAId, sharedOnAId, sharedOnBOnlyId, childBId, revokedOnAId, pedagogOnAId]
  );
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
    [primaryId, childBId]
  );
  await db.query(
    `UPDATE parent_child SET revoked_at = NOW() WHERE parent_id = $1 AND child_id = $2`,
    [revokedOnAId, childAId]
  );

  return {
    familyId,
    childAId,
    childBId,
    primaryId,
    sharedOnAId,
    sharedOnBOnlyId,
    revokedOnAId,
    pedagogOnAId,
    unlinkedId,
  };
}

function stubPushSends() {
  const sent = [];
  const orig = pushNotifications.sendPushNotification;
  pushNotifications.sendPushNotification = async (parentId, payload) => {
    sent.push({ parentId, payload });
    return { sent: 1, cleaned: 0 };
  };
  return {
    sent,
    restore() {
      pushNotifications.sendPushNotification = orig;
      push.clearPendingCompletions();
    },
  };
}

function recipientIds(sent) {
  return [...new Set(sent.map((row) => row.parentId))].sort();
}

describe('P0.3 child-scoped push recipients', () => {
  test('classifier treats push.js as push-recipients with L1 recipient test', () => {
    const plan = routeChangedFiles(ROOT, {
      files: ['src/lib/push.js'],
    });
    assert.ok(plan.domains.includes('push-recipients'));
    assert.ok(
      plan.verificationPlan.L1.tests.includes('test/push-child-scoped-recipients.integration.test.js')
    );
  });

  test('getLinkedParentsForChild excludes revoked, unlinked, and other-child-only', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    try {
      const fx = await seedFamily(db);
      const linkedA = (await push.getLinkedParentsForChild(fx.childAId)).map((p) => p.id).sort();
      assert.deepEqual(linkedA, [fx.primaryId, fx.sharedOnAId, fx.pedagogOnAId].sort());

      const linkedB = (await push.getLinkedParentsForChild(fx.childBId)).map((p) => p.id).sort();
      assert.deepEqual(linkedB, [fx.primaryId, fx.sharedOnBOnlyId].sort());

      const wrongFamily = await push.getLinkedParentsForChild(fx.childAId, crypto.randomUUID());
      assert.deepEqual(wrongFamily, []);
    } finally {
      await db.cleanup();
    }
  });

  test('star grant notifies only active linked parents', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    const stub = stubPushSends();
    try {
      const fx = await seedFamily(db);
      await push.notifyChildStarGranted(fx.childAId, 'A', 2, 'Primary');
      assert.deepEqual(recipientIds(stub.sent), [fx.primaryId, fx.sharedOnAId, fx.pedagogOnAId].sort());
      assert.ok(!recipientIds(stub.sent).includes(fx.sharedOnBOnlyId));
      assert.ok(!recipientIds(stub.sent).includes(fx.revokedOnAId));
      assert.ok(!recipientIds(stub.sent).includes(fx.unlinkedId));
    } finally {
      stub.restore();
      await db.cleanup();
    }
  });

  test('reward request notifies only active linked parents', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    const stub = stubPushSends();
    try {
      const fx = await seedFamily(db);
      await push.notifyParentsRewardRequest(fx.familyId, fx.childAId, 'A', 'Glass');
      assert.deepEqual(recipientIds(stub.sent), [fx.primaryId, fx.sharedOnAId, fx.pedagogOnAId].sort());
    } finally {
      stub.restore();
      await db.cleanup();
    }
  });

  test('activity completion notifies linked parents except excluded actor', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    const stub = stubPushSends();
    try {
      const fx = await seedFamily(db);
      await push.notifyParentsChildCompleted(fx.familyId, fx.childAId, 'A', 'Klä på');
      await push.notifyParentsChildCompleted(fx.familyId, fx.childAId, 'A', 'Borsta tänder');
      await push.notifyParentsChildCompleted(fx.familyId, fx.childAId, 'A', 'Äta frukost', fx.primaryId);
      assert.deepEqual(recipientIds(stub.sent), [fx.sharedOnAId, fx.pedagogOnAId].sort());
      assert.ok(!recipientIds(stub.sent).includes(fx.primaryId));
      assert.ok(!recipientIds(stub.sent).includes(fx.revokedOnAId));
      assert.ok(!recipientIds(stub.sent).includes(fx.sharedOnBOnlyId));
    } finally {
      stub.restore();
      await db.cleanup();
    }
  });

  test('sibling-only parent does not receive child A events', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    const stub = stubPushSends();
    try {
      const fx = await seedFamily(db);
      await push.notifyChildStarGranted(fx.childAId, 'A', 1, 'Primary');
      await push.notifyParentsRewardRequest(fx.familyId, fx.childAId, 'A', 'Bok');
      assert.ok(!recipientIds(stub.sent).includes(fx.sharedOnBOnlyId));
      stub.sent.length = 0;
      await push.notifyChildStarGranted(fx.childBId, 'B', 1, 'Primary');
      assert.deepEqual(recipientIds(stub.sent), [fx.primaryId, fx.sharedOnBOnlyId].sort());
    } finally {
      stub.restore();
      await db.cleanup();
    }
  });
});

describe('P0.3 static contracts', () => {
  test('child-event senders use getLinkedParentsForChild and never family-wide parents', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/push.js'), 'utf8');
    assert.match(src, /async function getLinkedParentsForChild/);
    assert.match(src, /revoked_at IS NULL/);
    assert.doesNotMatch(src, /function getFamilyParents/);
    const starSrc = src.slice(src.indexOf('async function notifyChildStarGranted'));
    const rewardSrc = src.slice(src.indexOf('async function notifyParentsRewardRequest'));
    const sendSrc = src.slice(src.indexOf('async function _sendParentsPush'));
    assert.match(starSrc, /getLinkedParentsForChild\(childId\)/);
    assert.match(rewardSrc, /getLinkedParentsForChild\(childId, familyId\)/);
    assert.match(sendSrc, /getLinkedParentsForChild\(childId, familyId\)/);
  });
});
