'use strict';

/**
 * För dig outcome follow-up — one parent / one email + isolated opt-out.
 * Requires real TEST_DATABASE_URL (0 skip).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');
const { setupTestDb } = require('./helpers/setup.js');
const { FOR_DIG_GOALS } = require('../src/lib/for-dig-config');
const {
  CTA_PATH,
  UNATTEND_FOOTER,
  dashboardCtaUrl,
  brandName,
  ctaLabel,
  buildSubject,
  buildOutcomeFollowupEmailHtml,
} = require('../src/lib/for-dig-outcome-email-template');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

try {
  const { buildDestructiveTestChildEnv } = require('../scripts/lib/test-database-safety.cjs');
  Object.assign(process.env, buildDestructiveTestChildEnv(process.env));
} catch {
  // setupTestDb() fail-closes later if TEST_DATABASE_URL is not allowed.
}

const GOAL_SLUG = FOR_DIG_GOALS[0].slug;
const GOAL_TITLE = FOR_DIG_GOALS[0].title;
const OTHER_GOAL = FOR_DIG_GOALS[1].slug;

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedFamily(db, { email, childName, parentName } = {}) {
  const suffix = uniqueSuffix();
  const fam = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free)
     VALUES ($1, 'Europe/Stockholm', true) RETURNING id`,
    [`Followup ${suffix}`]
  );
  const familyId = fam.rows[0].id;
  const parent = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, 'hash', $2, $3, true, true) RETURNING id`,
    [email || `followup-${suffix}@example.com`, familyId, parentName || 'Anna']
  );
  const parentId = parent.rows[0].id;
  const child = await db.query(
    `INSERT INTO child (family_id, name, emoji, username)
     VALUES ($1, $2, '⭐', $3) RETURNING id`,
    [familyId, childName || 'Astrid', `fu${suffix}`]
  );
  const childId = child.rows[0].id;
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
    [parentId, childId]
  );
  return {
    familyId,
    parentId,
    childId,
    email: email || `followup-${suffix}@example.com`,
    childName: childName || 'Astrid',
  };
}

async function addChild(db, family, childName) {
  const child = await db.query(
    `INSERT INTO child (family_id, name, emoji, username)
     VALUES ($1, $2, '⭐', $3) RETURNING id`,
    [family.familyId, childName, `fu${uniqueSuffix()}`]
  );
  const childId = child.rows[0].id;
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
    [family.parentId, childId]
  );
  return childId;
}

async function seedPending({ db, family, childId, daysAgo = 8, goalSlug = GOAL_SLUG, withIntent = true, withOutcome = false }) {
  const resolvedChild = childId || family.childId;
  await db.query(
    `INSERT INTO for_dig_goal_install (goal_slug, family_id, child_id, parent_id, installed_at)
     VALUES ($1, $2, $3, $4, NOW() - ($5::int || ' days')::interval)
     ON CONFLICT (goal_slug, family_id, child_id)
     DO UPDATE SET installed_at = EXCLUDED.installed_at, parent_id = EXCLUDED.parent_id`,
    [goalSlug, family.familyId, resolvedChild, family.parentId, daysAgo]
  );
  if (withIntent) {
    await db.query(
      `INSERT INTO for_dig_goal_feedback
         (family_id, parent_id, child_id, goal_slug, phase, intent_reason)
       VALUES ($1, $2, $3, $4, 'intent', 'tydligare_rutiner')
       ON CONFLICT DO NOTHING`,
      [family.familyId, family.parentId, resolvedChild, goalSlug]
    );
  }
  if (withOutcome) {
    await db.query(
      `INSERT INTO for_dig_goal_feedback
         (family_id, parent_id, child_id, goal_slug, phase, outcome_score)
       VALUES ($1, $2, $3, $4, 'outcome', 3)
       ON CONFLICT DO NOTHING`,
      [family.familyId, family.parentId, resolvedChild, goalSlug]
    );
  }
}

function pendingKey(row) {
  return `${row.family_id}:${row.child_id}:${row.goal_slug}`;
}

function signPayload(secret, payload, id, timestamp) {
  const key = Buffer.from(secret.replace('whsec_', ''), 'base64');
  const signed = `${id}.${timestamp}.${payload}`;
  const sig = crypto.createHmac('sha256', key).update(signed).digest('base64');
  return { id, timestamp, signature: `v1,${sig}` };
}

async function withSendEnabled(fn) {
  const prev = process.env.EMAIL_SEND_ENABLED;
  process.env.EMAIL_SEND_ENABLED = 'true';
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.EMAIL_SEND_ENABLED;
    else process.env.EMAIL_SEND_ENABLED = prev;
  }
}

async function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on('error', reject);
  });
}

test('followupIdempotencyKey is stable per batch+recipient and unique otherwise', () => {
  const { followupIdempotencyKey } = require('../db/for-dig-outcome-followup');
  const sameA = followupIdempotencyKey('batch-1', 'rec-1');
  const sameB = followupIdempotencyKey('batch-1', 'rec-1');
  const otherRecipient = followupIdempotencyKey('batch-1', 'rec-2');
  const otherBatch = followupIdempotencyKey('batch-2', 'rec-1');
  assert.equal(sameA, 'for-dig-followup:batch-1:rec-1');
  assert.equal(sameA, sameB);
  assert.notEqual(sameA, otherRecipient);
  assert.notEqual(sameA, otherBatch);
});

test('groupPendingByParent maps 72 items / 24 parents to 24 groups', () => {
  const { groupPendingByParent } = require('../db/for-dig-outcome-followup');
  const rows = [];
  for (let p = 0; p < 24; p++) {
    const parentId = `parent-${p}`;
    for (let i = 0; i < 3; i++) {
      rows.push({
        parent_id: parentId,
        parent_email: `p${p}@example.com`,
        parent_name: `P${p}`,
        family_id: `fam-${p}`,
        child_id: `child-${p}-${i}`,
        goal_slug: GOAL_SLUG,
        child_name: `C${i}`,
        goal_title: GOAL_TITLE,
      });
    }
  }
  const grouped = groupPendingByParent(rows);
  assert.equal(rows.length, 72);
  assert.equal(grouped.groups.size, 24);
  assert.equal([...grouped.groups.values()].every((g) => g.items.length === 3), true);
});

test('1. pending eligibility: intent + ≥7d + no outcome is listed', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const { listPendingOutcomesAdmin } = require('../db/for-dig-goal-feedback');
    const family = await seedFamily(db);
    await seedPending({ db, family, daysAgo: 8 });
    const pending = await listPendingOutcomesAdmin({ limit: 500, offset: 0 });
    const match = pending.rows.find((row) => row.child_id === family.childId && row.goal_slug === GOAL_SLUG);
    assert.ok(match, 'eligible row missing');
    assert.equal(match.parent_id, family.parentId);
    assert.equal(match.family_id, family.familyId);
    assert.ok(match.days_since_install >= 7);
  } finally {
    await db.cleanup();
  }
});

test('2. pending eligibility: <7d, existing outcome, and other family are excluded', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const { listPendingOutcomesAdmin } = require('../db/for-dig-goal-feedback');
    const tooNew = await seedFamily(db, { childName: 'Ny' });
    const hasOutcome = await seedFamily(db, { childName: 'Klar' });
    const otherFamily = await seedFamily(db, { childName: 'Annan' });
    await seedPending({ db, family: tooNew, daysAgo: 2 });
    await seedPending({ db, family: hasOutcome, daysAgo: 10, withOutcome: true });
    await seedPending({ db, family: otherFamily, daysAgo: 10 });

    const pending = await listPendingOutcomesAdmin({ limit: 500, offset: 0 });
    const keys = new Set(pending.rows.map(pendingKey));
    assert.equal(keys.has(pendingKey({ family_id: tooNew.familyId, child_id: tooNew.childId, goal_slug: GOAL_SLUG })), false);
    assert.equal(keys.has(pendingKey({ family_id: hasOutcome.familyId, child_id: hasOutcome.childId, goal_slug: GOAL_SLUG })), false);
    assert.equal(keys.has(pendingKey({ family_id: otherFamily.familyId, child_id: otherFamily.childId, goal_slug: GOAL_SLUG })), true);
  } finally {
    await db.cleanup();
  }
});

test('3. three pending items same parent → 1 recipient; items match pending', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const family = await seedFamily(db);
    await seedPending({ db, family, daysAgo: 9, goalSlug: FOR_DIG_GOALS[0].slug });
    await seedPending({ db, family, daysAgo: 9, goalSlug: FOR_DIG_GOALS[1].slug });
    await seedPending({ db, family, daysAgo: 9, goalSlug: FOR_DIG_GOALS[2].slug });
    const batch = await followup.createBatch();
    const prepared = await followup.prepareFromPending(batch.id);
    const recipients = await followup.listRecipients(batch.id);
    const mine = recipients.filter((row) => row.parent_id === family.parentId);
    assert.equal(mine.length, 1);
    assert.equal(mine[0].items.length, 3);
    assert.equal(prepared.inserted >= 1, true);
    assert.equal(new Set(recipients.map((row) => row.parent_id)).size, recipients.length);
  } finally {
    await db.cleanup();
  }
});

test('4. twelve pending items same parent → 1 recipient', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    assert.ok(FOR_DIG_GOALS.length >= 6);
    const followup = require('../db/for-dig-outcome-followup');
    const family = await seedFamily(db, { childName: 'Ett' });
    const siblingId = await addChild(db, family, 'Två');
    for (const goal of FOR_DIG_GOALS) {
      await seedPending({ db, family, daysAgo: 10, goalSlug: goal.slug });
      await seedPending({ db, family, childId: siblingId, daysAgo: 10, goalSlug: goal.slug });
    }
    const batch = await followup.createBatch();
    await followup.prepareFromPending(batch.id);
    const mine = (await followup.listRecipients(batch.id)).filter((row) => row.parent_id === family.parentId);
    assert.equal(mine.length, 1);
    assert.equal(mine[0].items.length, FOR_DIG_GOALS.length * 2);
  } finally {
    await db.cleanup();
  }
});

test('5. two different parents → 2 recipients', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const a = await seedFamily(db, { parentName: 'Ada' });
    const b = await seedFamily(db, { parentName: 'Bo' });
    await seedPending({ db, family: a, daysAgo: 8 });
    await seedPending({ db, family: b, daysAgo: 8 });
    const batch = await followup.createBatch();
    const prepared = await followup.prepareFromPending(batch.id);
    const recipients = await followup.listRecipients(batch.id);
    const mine = recipients.filter((row) => row.parent_id === a.parentId || row.parent_id === b.parentId);
    assert.equal(mine.length, 2);
    assert.equal(prepared.unique_parents >= 2, true);
  } finally {
    await db.cleanup();
  }
});

test('6. UNIQUE(batch_id, parent_id) blocks duplicate recipient rows', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const family = await seedFamily(db);
    const batch = await followup.createBatch();
    await db.query(
      `INSERT INTO for_dig_outcome_followup_recipient (batch_id, parent_id, recipient_email)
       VALUES ($1, $2, $3)`,
      [batch.id, family.parentId, family.email]
    );
    await assert.rejects(
      () => db.query(
        `INSERT INTO for_dig_outcome_followup_recipient (batch_id, parent_id, recipient_email)
         VALUES ($1, $2, $3)`,
        [batch.id, family.parentId, family.email]
      ),
      (err) => err && err.code === '23505'
    );
  } finally {
    await db.cleanup();
  }
});

test('7. one question + four scores even when several items; fallback CTA if no recipient', () => {
  const { OUTCOME_CHOICES, MORE_ITEMS_NOTE, CTA_LABEL } = require('../src/lib/for-dig-outcome-email-template');
  const recipientId = '11111111-1111-4111-8111-111111111111';
  assert.equal(CTA_PATH, '/dashboard?for_dig_feedback=1');
  assert.equal(buildSubject({ goalTitle: GOAL_TITLE, itemCount: 1 }), `Hur går det med ${GOAL_TITLE}?`);
  assert.equal(buildSubject({ goalTitle: GOAL_TITLE, itemCount: 12 }), `Hur går det med ${GOAL_TITLE}?`);
  assert.equal(ctaLabel(), CTA_LABEL);
  const cta = dashboardCtaUrl('https://example.test');
  assert.equal(cta, 'https://example.test/dashboard?for_dig_feedback=1');
  const fallback = buildOutcomeFollowupEmailHtml({
    parentName: 'Anna',
    items: [{ goalTitle: GOAL_TITLE, childName: 'Astrid' }],
    ctaUrl: cta,
    unsubscribeUrl: 'https://example.test/for-dig/followup-unsubscribe?t=token',
  });
  assert.match(fallback, /https:\/\/example\.test\/dashboard\?for_dig_feedback=1/);
  assert.match(fallback, new RegExp(GOAL_TITLE));
  assert.match(fallback, /Astrid/);
  assert.equal(fallback.includes(UNATTEND_FOOTER), true);
  assert.doesNotMatch(fallback, /transaktionell/i);
  assert.doesNotMatch(fallback, /gå till Hem/i);

  const single = buildOutcomeFollowupEmailHtml({
    parentName: 'Anna',
    items: [{ goalTitle: GOAL_TITLE, childName: 'Astrid' }],
    recipientId,
    baseUrl: 'https://example.test',
    unsubscribeUrl: 'https://example.test/for-dig/followup-unsubscribe?t=token',
  });
  assert.match(single, /\/for-dig\/hur-gick-det\?/);
  assert.match(single, /score=4/);
  assert.match(single, /Stor förbättring/);
  assert.equal(OUTCOME_CHOICES.every((choice) => single.includes(choice.label)), true);
  assert.doesNotMatch(single, new RegExp(`Öppna ${brandName()}`));
  assert.doesNotMatch(single, /parent_id/i);
  assert.doesNotMatch(single, /@example\.com/);

  const multi = buildOutcomeFollowupEmailHtml({
    parentName: 'Anna',
    items: [
      { goalTitle: GOAL_TITLE, childName: 'Astrid' },
      { goalTitle: FOR_DIG_GOALS[1].title, childName: 'Astrid' },
    ],
    recipientId,
    baseUrl: 'https://example.test',
  });
  assert.match(multi, new RegExp(GOAL_TITLE));
  assert.match(multi, /Astrid/);
  assert.match(multi, new RegExp(MORE_ITEMS_NOTE));
  assert.doesNotMatch(multi, /några saker/);
  assert.match(multi, /\/for-dig\/hur-gick-det\?/);
  assert.doesNotMatch(multi, new RegExp(`Öppna ${brandName()}`));
});

test('8. opted-out parent is excluded from prepare; newsletter subscription unchanged', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const prefs = require('../db/for-dig-followup-email-preference');
    const family = await seedFamily(db);
    const other = await seedFamily(db);
    await seedPending({ db, family, daysAgo: 8 });
    await seedPending({ db, family: other, daysAgo: 8 });
    await db.query(
      `INSERT INTO email_subscriptions (parent_id, email, subscribed, subscribed_at, unsubscribe_token)
       VALUES ($1, $2, true, NOW(), $3)
       ON CONFLICT (parent_id) DO UPDATE SET subscribed = true, unsubscribed_at = NULL`,
      [family.parentId, family.email, crypto.randomUUID()]
    );
    const beforeFlag = await db.query(`SELECT newsletter_subscribed FROM parent WHERE id = $1`, [family.parentId]);
    const pref = await prefs.ensurePreference(family.parentId);
    await db.query(
      `UPDATE for_dig_followup_email_preference SET opted_out_at = NOW() WHERE parent_id = $1`,
      [family.parentId]
    );
    const batch = await followup.createBatch();
    const prepared = await followup.prepareFromPending(batch.id);
    const recipients = await followup.listRecipients(batch.id);
    assert.equal(recipients.some((row) => row.parent_id === family.parentId), false);
    assert.equal(recipients.some((row) => row.parent_id === other.parentId), true);
    assert.equal(prepared.opted_out >= 1, true);
    const sub = await prefs.newsletterSubscribed(family.parentId);
    assert.equal(sub, true);
    const afterFlag = await db.query(`SELECT newsletter_subscribed FROM parent WHERE id = $1`, [family.parentId]);
    assert.deepEqual(afterFlag.rows[0], beforeFlag.rows[0]);
    assert.ok(pref.unsub_token);
  } finally {
    await db.cleanup();
  }
});

test('9. unsubscribe token for parent A cannot change parent B; opt-out is idempotent', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const prefs = require('../db/for-dig-followup-email-preference');
    const { signUnsubToken, verifyUnsubToken, buildUnsubscribeUrl } = require('../src/lib/for-dig-followup-unsub-token');
    const a = await seedFamily(db, { parentName: 'Ada' });
    const b = await seedFamily(db, { parentName: 'Bo' });
    const prefA = await prefs.ensurePreference(a.parentId);
    const prefB = await prefs.ensurePreference(b.parentId);
    const url = buildUnsubscribeUrl(prefA.unsub_token, 'https://example.test');
    assert.doesNotMatch(url, new RegExp(a.parentId, 'i'));
    assert.doesNotMatch(url, /@/);
    assert.doesNotMatch(url, new RegExp(a.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const verified = verifyUnsubToken(signUnsubToken(prefA.unsub_token));
    assert.equal(verified.ok, true);
    const first = await prefs.optOutByUnsubToken(prefA.unsub_token);
    const second = await prefs.optOutByUnsubToken(prefA.unsub_token);
    assert.equal(first.ok, true);
    assert.equal(first.alreadyOptedOut, false);
    assert.equal(second.ok, true);
    assert.equal(second.alreadyOptedOut, true);
    assert.equal(await prefs.isOptedOut(a.parentId), true);
    assert.equal(await prefs.isOptedOut(b.parentId), false);
    assert.equal(prefB.parent_id, b.parentId);

    await db.query(
      `INSERT INTO email_subscriptions (parent_id, email, subscribed, subscribed_at, unsubscribe_token)
       VALUES ($1, $2, true, NOW(), $3)
       ON CONFLICT (parent_id) DO UPDATE SET subscribed = true, unsubscribed_at = NULL`,
      [a.parentId, a.email, crypto.randomUUID()]
    );
    await db.query(`UPDATE parent SET newsletter_subscribed = true WHERE id = $1`, [a.parentId]);

    const unsub = require('../src/routes/for-dig-followup-unsubscribe');
    const app = express();
    app.use(unsub);
    const server = await listen(app);
    try {
      const port = server.address().port;
      const tokenA = signUnsubToken(prefA.unsub_token);
      const again = await fetch(`http://127.0.0.1:${port}/for-dig/followup-unsubscribe?t=${encodeURIComponent(tokenA)}`);
      assert.equal(again.status, 200);
      const body = await again.text();
      assert.match(body, /Du får inte längre uppföljningsmejl om För dig/);
      assert.equal(await prefs.isOptedOut(b.parentId), false);
      const news = await db.query(
        `SELECT subscribed FROM email_subscriptions WHERE parent_id = $1`,
        [a.parentId]
      );
      assert.equal(news.rows[0].subscribed, true);
      const flag = await db.query(
        `SELECT newsletter_subscribed FROM parent WHERE id = $1`,
        [a.parentId]
      );
      assert.equal(flag.rows[0].newsletter_subscribed, true);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await db.cleanup();
  }
});

test('10. opt-out after prepare but before send → no email / no newsletter_email_send', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const prefs = require('../db/for-dig-followup-email-preference');
    const family = await seedFamily(db);
    await seedPending({ db, family, daysAgo: 8 });
    const batch = await followup.createBatch();
    await followup.prepareFromPending(batch.id);
    const pref = await prefs.ensurePreference(family.parentId);
    await prefs.optOutByUnsubToken(pref.unsub_token);
    const result = await withSendEnabled(() => followup.sendBatch(batch.id));
    assert.equal(result.dryRun, false);
    assert.equal(result.sent, 0);
    assert.equal(result.skipped_opted_out >= 1, true);
    const sends = await db.query(
      `SELECT id FROM newsletter_email_send WHERE campaign_type = $1 AND campaign_id = $2`,
      [followup.CAMPAIGN_TYPE, batch.id]
    );
    assert.equal(sends.rowCount, 0);
  } finally {
    await db.cleanup();
  }
});

test('11. all outcomes after prepare → skip send; some remaining → max 1 email', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const answered = await seedFamily(db, { parentName: 'Klar' });
    const partial = await seedFamily(db, { parentName: 'Delvis' });
    await seedPending({ db, family: answered, daysAgo: 8, goalSlug: FOR_DIG_GOALS[0].slug });
    await seedPending({ db, family: answered, daysAgo: 8, goalSlug: FOR_DIG_GOALS[1].slug });
    await seedPending({ db, family: partial, daysAgo: 8, goalSlug: FOR_DIG_GOALS[0].slug });
    await seedPending({ db, family: partial, daysAgo: 8, goalSlug: FOR_DIG_GOALS[1].slug });
    const batch = await followup.createBatch();
    await followup.prepareFromPending(batch.id);
    await db.query(
      `INSERT INTO for_dig_goal_feedback
         (family_id, parent_id, child_id, goal_slug, phase, outcome_score)
       VALUES ($1, $2, $3, $4, 'outcome', 4),
              ($5, $6, $7, $8, 'outcome', 3),
              ($9, $10, $11, $12, 'outcome', 2)`,
      [
        answered.familyId, answered.parentId, answered.childId, FOR_DIG_GOALS[0].slug,
        answered.familyId, answered.parentId, answered.childId, FOR_DIG_GOALS[1].slug,
        partial.familyId, partial.parentId, partial.childId, FOR_DIG_GOALS[0].slug,
      ]
    );
    const result = await withSendEnabled(() => followup.sendBatch(batch.id));
    assert.equal(result.dryRun, false);
    assert.equal(result.sent, 1);
    assert.equal(result.skipped_no_pending >= 1, true);
    const sends = await db.query(
      `SELECT parent_id FROM newsletter_email_send WHERE campaign_type = $1 AND campaign_id = $2`,
      [followup.CAMPAIGN_TYPE, batch.id]
    );
    assert.equal(sends.rowCount, 1);
    assert.equal(sends.rows[0].parent_id, partial.parentId);
  } finally {
    await db.cleanup();
  }
});

test('12. dry-run → no sends / newsletter_email_send rows', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  const prev = process.env.EMAIL_SEND_ENABLED;
  try {
    delete process.env.EMAIL_SEND_ENABLED;
    const followup = require('../db/for-dig-outcome-followup');
    const family = await seedFamily(db);
    await seedPending({ db, family, daysAgo: 8 });
    const batch = await followup.createBatch();
    await followup.prepareFromPending(batch.id);
    const preview = await followup.previewBatch(batch.id);
    assert.equal(preview.pending_item_count >= 1, true);
    assert.equal(preview.unique_parents >= 1, true);
    assert.equal(typeof preview.opted_out, 'number');
    assert.equal(typeof preview.recipient_count, 'number');
    const unsetResult = await followup.sendBatch(batch.id);
    assert.equal(unsetResult.dryRun, true);
    assert.equal(unsetResult.sent, 0);
    process.env.EMAIL_SEND_ENABLED = 'false';
    const falseResult = await followup.sendBatch(batch.id);
    assert.equal(falseResult.dryRun, true);
    const sends = await db.query(
      `SELECT id FROM newsletter_email_send WHERE campaign_type = $1 AND campaign_id = $2`,
      [followup.CAMPAIGN_TYPE, batch.id]
    );
    assert.equal(sends.rowCount, 0);
    const after = await followup.getBatch(batch.id);
    assert.equal(after.sent_at, null);
    assert.notEqual(after.status, 'sent');
  } finally {
    if (prev === undefined) delete process.env.EMAIL_SEND_ENABLED;
    else process.env.EMAIL_SEND_ENABLED = prev;
    await db.cleanup();
  }
});

test('13. outcome attribution after send matches family+child+goal via recipient items', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const family = await seedFamily(db);
    await seedPending({ db, family, daysAgo: 8 });
    const batch = await followup.createBatch();
    await followup.prepareFromPending(batch.id);
    await db.query(
      `UPDATE for_dig_outcome_followup_batch
       SET status = 'sent', sent_at = NOW() - INTERVAL '1 hour'
       WHERE id = $1`,
      [batch.id]
    );
    await db.query(
      `INSERT INTO for_dig_goal_feedback
         (family_id, parent_id, child_id, goal_slug, phase, outcome_score, created_at)
       VALUES ($1, $2, $3, $4, 'outcome', 4, NOW())`,
      [family.familyId, family.parentId, family.childId, GOAL_SLUG]
    );
    const attributed = await followup.listAttributedOutcomes(batch.id);
    assert.equal(attributed.length, 1);
    assert.equal(attributed[0].family_id, family.familyId);
    assert.equal(attributed[0].child_id, family.childId);
    assert.equal(attributed[0].goal_slug, GOAL_SLUG);
  } finally {
    await db.cleanup();
  }
});

test('14. outcome attribution rejects before send, sent_at null, and wrong child/goal/family', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const family = await seedFamily(db, { childName: 'Rätt' });
    const other = await seedFamily(db, { childName: 'Fel' });
    await seedPending({ db, family, daysAgo: 8 });
    const batch = await followup.createBatch();
    await followup.prepareFromPending(batch.id);
    await db.query(
      `INSERT INTO for_dig_goal_feedback
         (family_id, parent_id, child_id, goal_slug, phase, outcome_score, created_at)
       VALUES ($1, $2, $3, $4, 'outcome', 3, NOW() - INTERVAL '2 hours')`,
      [family.familyId, family.parentId, family.childId, GOAL_SLUG]
    );
    assert.equal((await followup.listAttributedOutcomes(batch.id)).length, 0);

    await db.query(
      `UPDATE for_dig_outcome_followup_batch
       SET status = 'sent', sent_at = NOW() - INTERVAL '30 minutes'
       WHERE id = $1`,
      [batch.id]
    );
    await db.query(
      `INSERT INTO for_dig_goal_feedback
         (family_id, parent_id, child_id, goal_slug, phase, outcome_score)
       VALUES ($1, $2, $3, $4, 'outcome', 2)`,
      [other.familyId, other.parentId, other.childId, GOAL_SLUG]
    );
    await db.query(
      `INSERT INTO for_dig_goal_feedback
         (family_id, parent_id, child_id, goal_slug, phase, outcome_score)
       VALUES ($1, $2, $3, $4, 'outcome', 2)`,
      [family.familyId, family.parentId, family.childId, OTHER_GOAL]
    );
    assert.equal((await followup.listAttributedOutcomes(batch.id)).length, 0);
  } finally {
    await db.cleanup();
  }
});

test('15. migration leaves existing newsletter and for_dig data unchanged', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const family = await seedFamily(db);
    await seedPending({ db, family, daysAgo: 8 });
    const campaignId = crypto.randomUUID();
    await db.query(
      `INSERT INTO newsletter_email_send
         (campaign_type, campaign_id, parent_id, recipient_email, resend_email_id)
       VALUES ('standalone', $1, $2, $3, $4)`,
      [campaignId, family.parentId, family.email, `re_standalone_${uniqueSuffix()}`]
    );
    const beforeNews = await db.query(
      `SELECT campaign_type, campaign_id, recipient_email FROM newsletter_email_send WHERE campaign_id = $1`,
      [campaignId]
    );
    const beforeFeedback = await db.query(
      `SELECT phase, goal_slug FROM for_dig_goal_feedback WHERE family_id = $1 ORDER BY phase`,
      [family.familyId]
    );
    const tables = await db.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'for_dig_outcome_followup_batch',
          'for_dig_outcome_followup_recipient',
          'for_dig_outcome_followup_recipient_item',
          'for_dig_followup_email_preference'
        )
      ORDER BY tablename
    `);
    assert.deepEqual(
      tables.rows.map((row) => row.tablename),
      [
        'for_dig_followup_email_preference',
        'for_dig_outcome_followup_batch',
        'for_dig_outcome_followup_recipient',
        'for_dig_outcome_followup_recipient_item',
      ]
    );
    const afterNews = await db.query(
      `SELECT campaign_type, campaign_id, recipient_email FROM newsletter_email_send WHERE campaign_id = $1`,
      [campaignId]
    );
    const afterFeedback = await db.query(
      `SELECT phase, goal_slug FROM for_dig_goal_feedback WHERE family_id = $1 ORDER BY phase`,
      [family.familyId]
    );
    assert.equal(afterNews.rows[0].campaign_type, 'standalone');
    assert.deepEqual(afterNews.rows, beforeNews.rows);
    assert.deepEqual(afterFeedback.rows, beforeFeedback.rows);
  } finally {
    await db.cleanup();
  }
});

test('16. newsletter standalone recordSend/stats/recipients still work; webhook updates for_dig tracking', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const tracking = require('../db/newsletter-email-tracking');
    const followup = require('../db/for-dig-outcome-followup');
    const family = await seedFamily(db);
    const campaignId = crypto.randomUUID();
    const sendId = await tracking.recordSend({
      campaignType: 'standalone',
      campaignId,
      parentId: family.parentId,
      recipientEmail: family.email,
      resendEmailId: `re_standalone_${uniqueSuffix()}`,
    });
    assert.ok(sendId);
    const stats = await tracking.getCampaignStats('standalone', campaignId);
    assert.equal(stats.sent, 1);
    const recipients = await tracking.getCampaignRecipients('standalone', campaignId);
    assert.equal(recipients.length, 1);
    assert.equal(recipients[0].email, family.email);

    const batch = await followup.createBatch();
    const emailId = `re_fordig_${uniqueSuffix()}`;
    await db.query(
      `INSERT INTO newsletter_email_send
         (campaign_type, campaign_id, parent_id, recipient_email, resend_email_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [followup.CAMPAIGN_TYPE, batch.id, family.parentId, family.email, emailId]
    );

    const secret = 'whsec_' + Buffer.from('test-secret-key-32bytes!!!!').toString('base64');
    const prevSecret = process.env.RESEND_WEBHOOK_SECRET;
    process.env.RESEND_WEBHOOK_SECRET = secret;
    const webhookPath = require.resolve('../src/routes/resend-webhook');
    delete require.cache[webhookPath];
    const { handleResendWebhook } = require('../src/routes/resend-webhook');
    const app = express();
    app.post('/api/resend/webhook', express.raw({ type: 'application/json' }), handleResendWebhook);
    const server = await listen(app);
    try {
      const port = server.address().port;
      async function postWebhook(type, extraData, msgId) {
        const payload = JSON.stringify({
          type,
          created_at: new Date().toISOString(),
          data: { email_id: emailId, ...(extraData || {}) },
        });
        const ts = String(Math.floor(Date.now() / 1000));
        const { id, timestamp, signature } = signPayload(secret, payload, msgId, ts);
        const res = await fetch(`http://127.0.0.1:${port}/api/resend/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'svix-id': id,
            'svix-timestamp': timestamp,
            'svix-signature': signature,
          },
          body: payload,
        });
        assert.equal(res.status, 200);
      }
      await postWebhook('email.delivered', {}, 'msg_delivered');
      for (let i = 0; i < 2; i++) {
        await postWebhook('email.opened', {}, `msg_open_${i}`);
      }
      await postWebhook('email.clicked', { click: { link: 'https://example.test/dashboard?for_dig_feedback=1' } }, 'msg_click_1');
      await postWebhook('email.clicked', { click: { link: 'https://example.test/dashboard?for_dig_feedback=1' } }, 'msg_click_2');
    } finally {
      await new Promise((resolve) => server.close(resolve));
      if (prevSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
      else process.env.RESEND_WEBHOOK_SECRET = prevSecret;
    }

    const row = await db.query(
      `SELECT open_count, click_count, delivered_at, first_opened_at, first_clicked_at, campaign_type
         FROM newsletter_email_send WHERE resend_email_id = $1`,
      [emailId]
    );
    assert.equal(row.rows[0].campaign_type, 'for_dig_outcome_followup');
    assert.equal(row.rows[0].open_count, 2);
    assert.equal(row.rows[0].click_count, 2);
    assert.ok(row.rows[0].delivered_at);
    assert.ok(row.rows[0].first_opened_at);
    assert.ok(row.rows[0].first_clicked_at);
  } finally {
    await db.cleanup();
  }
});

test('16b. for-dig bounce/complaint are tracked without mutating newsletter or for-dig opt-out', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const prefs = require('../db/for-dig-followup-email-preference');
    const family = await seedFamily(db);
    await prefs.ensurePreference(family.parentId);
    await db.query(
      `INSERT INTO email_subscriptions (parent_id, email, subscribed, subscribed_at, unsubscribe_token)
       VALUES ($1, $2, true, NOW(), $3)
       ON CONFLICT (parent_id) DO UPDATE SET subscribed = true, unsubscribed_at = NULL`,
      [family.parentId, family.email, crypto.randomUUID()]
    );
    await db.query(`UPDATE parent SET newsletter_subscribed = true WHERE id = $1`, [family.parentId]);

    const batch = await followup.createBatch();
    const bounceId = `re_fordig_bounce_${uniqueSuffix()}`;
    const complaintId = `re_fordig_complaint_${uniqueSuffix()}`;
    await db.query(
      `INSERT INTO newsletter_email_send
         (campaign_type, campaign_id, parent_id, recipient_email, resend_email_id)
       VALUES ($1, $2, $3, $4, $5), ($1, $2, $3, $4, $6)`,
      [followup.CAMPAIGN_TYPE, batch.id, family.parentId, family.email, bounceId, complaintId]
    );

    const secret = 'whsec_' + Buffer.from('test-secret-key-32bytes!!!!').toString('base64');
    const prevSecret = process.env.RESEND_WEBHOOK_SECRET;
    process.env.RESEND_WEBHOOK_SECRET = secret;
    const webhookPath = require.resolve('../src/routes/resend-webhook');
    delete require.cache[require.resolve('../src/lib/newsletter-unsubscribe')];
    delete require.cache[webhookPath];
    const { handleResendWebhook } = require('../src/routes/resend-webhook');
    const app = express();
    app.post('/api/resend/webhook', express.raw({ type: 'application/json' }), handleResendWebhook);
    const server = await listen(app);
    try {
      const port = server.address().port;
      async function postWebhook(emailId, type, extraData, msgId) {
        const payload = JSON.stringify({
          type,
          created_at: new Date().toISOString(),
          data: { email_id: emailId, to: [family.email], ...(extraData || {}) },
        });
        const ts = String(Math.floor(Date.now() / 1000));
        const { id, timestamp, signature } = signPayload(secret, payload, msgId, ts);
        const res = await fetch(`http://127.0.0.1:${port}/api/resend/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'svix-id': id,
            'svix-timestamp': timestamp,
            'svix-signature': signature,
          },
          body: payload,
        });
        assert.equal(res.status, 200);
        return res.json();
      }
      const bounceBody = await postWebhook(
        bounceId,
        'email.bounced',
        { bounce: { type: 'Permanent' } },
        'msg_fordig_bounce'
      );
      assert.equal(bounceBody.action, 'bounce_processed');
      const bounceReplay = await postWebhook(
        bounceId,
        'email.bounced',
        { bounce: { type: 'Permanent' } },
        'msg_fordig_bounce_replay'
      );
      assert.equal(bounceReplay.action, 'bounce_processed');
      const complaintBody = await postWebhook(complaintId, 'email.complained', {}, 'msg_fordig_complaint');
      assert.equal(complaintBody.action, 'complaint_processed');
    } finally {
      await new Promise((resolve) => server.close(resolve));
      if (prevSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
      else process.env.RESEND_WEBHOOK_SECRET = prevSecret;
    }

    const events = await db.query(
      `SELECT event_type, email_id FROM resend_webhook_event
        WHERE email_id IN ($1, $2) ORDER BY received_at, event_type`,
      [bounceId, complaintId]
    );
    const bounceEvents = events.rows.filter((row) => row.email_id === bounceId && row.event_type === 'email.bounced');
    const complaintEvents = events.rows.filter((row) => row.email_id === complaintId && row.event_type === 'email.complained');
    assert.equal(bounceEvents.length, 2);
    assert.equal(complaintEvents.length, 1);

    const news = await db.query(
      `SELECT subscribed FROM email_subscriptions WHERE parent_id = $1`,
      [family.parentId]
    );
    assert.equal(news.rows[0].subscribed, true);
    const flag = await db.query(
      `SELECT newsletter_subscribed FROM parent WHERE id = $1`,
      [family.parentId]
    );
    assert.equal(flag.rows[0].newsletter_subscribed, true);
    assert.equal(await prefs.isOptedOut(family.parentId), false);
  } finally {
    await db.cleanup();
  }
});

function stubSendEmail(impl) {
  const emailLib = require('../src/lib/email');
  const original = emailLib.sendEmail;
  emailLib.sendEmail = impl;
  return () => {
    emailLib.sendEmail = original;
  };
}

test('17. default prepare max_recipients=5 is deterministic newest-first', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const followup = require('../db/for-dig-outcome-followup');
    assert.equal(followup.DEFAULT_MAX_RECIPIENTS, 5);
    const families = [];
    for (let daysAgo = 8; daysAgo <= 15; daysAgo++) {
      const family = await seedFamily(db, { parentName: `P${daysAgo}` });
      await seedPending({ db, family, daysAgo });
      families.push({ family, daysAgo });
    }
    const batch = await followup.createBatch();
    const prepared = await followup.prepareFromPending(batch.id);
    assert.equal(prepared.max_recipients, 5);
    assert.equal(prepared.inserted, 5);
    const recipients = await followup.listRecipients(batch.id);
    const selectedIds = new Set(recipients.map((row) => row.parent_id));
    const newestFive = families.filter((row) => row.daysAgo <= 12).map((row) => row.family.parentId);
    const oldestThree = families.filter((row) => row.daysAgo >= 13).map((row) => row.family.parentId);
    assert.equal(newestFive.every((id) => selectedIds.has(id)), true);
    assert.equal(oldestThree.every((id) => !selectedIds.has(id)), true);
    const preview = await followup.previewPilotSelection({ maxRecipients: 5 });
    assert.equal(preview.recipient_count, 5);
    assert.equal(preview.remaining_parents, 3);
    assert.equal(preview.invalid_or_missing_email, 0);
    const batchesAfterPreview = await db.query('SELECT COUNT(*)::int AS n FROM for_dig_outcome_followup_batch');
    assert.equal(batchesAfterPreview.rows[0].n, 1);
  } finally {
    await db.cleanup();
  }
});

test('18. cross-batch excludes emailed item; new goal can become eligible again', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  const restore = stubSendEmail(async (opts) => ({
    success: true,
    provider: 'mock',
    emailId: `re_${opts.idempotencyKey}`,
  }));
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const family = await seedFamily(db);
    const other = await seedFamily(db);
    await seedPending({ db, family, daysAgo: 8, goalSlug: GOAL_SLUG });
    await seedPending({ db, family: other, daysAgo: 8, goalSlug: GOAL_SLUG });
    const batch1 = await followup.createBatch();
    await followup.prepareFromPending(batch1.id, { maxRecipients: 10 });
    const sent = await withSendEnabled(() => followup.sendBatch(batch1.id));
    assert.equal(sent.sent, 2);
    assert.equal(sent.batch_status, 'sent');

    const batch2 = await followup.createBatch();
    await followup.prepareFromPending(batch2.id, { maxRecipients: 10 });
    const round2 = await followup.listRecipients(batch2.id);
    assert.equal(round2.some((row) => row.parent_id === family.parentId), false);
    assert.equal(round2.some((row) => row.parent_id === other.parentId), false);

    await seedPending({ db, family, daysAgo: 8, goalSlug: OTHER_GOAL });
    const batch3 = await followup.createBatch();
    await followup.prepareFromPending(batch3.id, { maxRecipients: 10 });
    const round3 = await followup.listRecipients(batch3.id);
    const mine = round3.filter((row) => row.parent_id === family.parentId);
    assert.equal(mine.length, 1);
    assert.deepEqual(mine[0].items.map((item) => item.goal_slug), [OTHER_GOAL]);
  } finally {
    restore();
    await db.cleanup();
  }
});

test('19. parallel sendBatch claims once per recipient and retries keep idempotency key', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  const calls = [];
  const restore = stubSendEmail(async (opts) => {
    calls.push(opts);
    await new Promise((resolve) => setTimeout(resolve, 60));
    return { success: true, provider: 'mock', emailId: `re_${calls.length}` };
  });
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const a = await seedFamily(db, { parentName: 'Ada' });
    const b = await seedFamily(db, { parentName: 'Bo' });
    await seedPending({ db, family: a, daysAgo: 8 });
    await seedPending({ db, family: b, daysAgo: 8 });
    const batch = await followup.createBatch();
    await followup.prepareFromPending(batch.id, { maxRecipients: 10 });
    const recipients = await followup.listRecipients(batch.id);
    const [first, second] = await withSendEnabled(() => Promise.all([
      followup.sendBatch(batch.id),
      followup.sendBatch(batch.id),
    ]));
    assert.equal(calls.length, 2);
    assert.equal(new Set(calls.map((row) => row.to)).size, 2);
    assert.equal(first.sent + second.sent >= 2, true);
    const after = await followup.getBatch(batch.id);
    assert.equal(after.status, 'sent');
    const expectedKeys = recipients.map((row) => followup.followupIdempotencyKey(batch.id, row.id)).sort();
    assert.deepEqual(calls.map((row) => row.idempotencyKey).sort(), expectedKeys);
  } finally {
    restore();
    await db.cleanup();
  }
});

test('20. partial failure is not sent; retry sends only failed with same key', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  const calls = [];
  let failOnce = true;
  const restore = stubSendEmail(async (opts) => {
    calls.push(opts);
    if (failOnce && calls.length === 2) {
      return { success: false, provider: 'mock', error: 'provider_failed' };
    }
    return { success: true, provider: 'mock', emailId: `re_${calls.length}` };
  });
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const a = await seedFamily(db, { parentName: 'Ada' });
    const b = await seedFamily(db, { parentName: 'Bo' });
    await seedPending({ db, family: a, daysAgo: 8 });
    await seedPending({ db, family: b, daysAgo: 8 });
    const batch = await followup.createBatch();
    await followup.prepareFromPending(batch.id, { maxRecipients: 10 });
    const first = await withSendEnabled(() => followup.sendBatch(batch.id));
    assert.equal(first.sent, 1);
    assert.equal(first.failed, 1);
    assert.equal(first.retryable, 1);
    assert.equal(first.batch_status, 'partial_failed');
    const afterFirst = await followup.getBatch(batch.id);
    assert.equal(afterFirst.status, 'partial_failed');
    assert.notEqual(afterFirst.status, 'sent');

    failOnce = false;
    const keysBeforeRetry = calls.map((row) => row.idempotencyKey).sort();
    const retry = await withSendEnabled(() => followup.sendBatch(batch.id));
    assert.equal(retry.sent, 2);
    assert.equal(retry.failed, 0);
    assert.equal(retry.batch_status, 'sent');
    assert.equal(calls.length, 3);
    const retryKey = calls[2].idempotencyKey;
    assert.equal(keysBeforeRetry.includes(retryKey), true);
  } finally {
    restore();
    await db.cleanup();
  }
});

test('21. crash after provider accept retries with the same HTTP Idempotency-Key', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  const prevKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 're_test_followup_idempotency';
  const fetchCalls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, opts) => {
    if (url !== 'https://api.resend.com/emails') {
      throw new Error(`unexpected fetch: ${url}`);
    }
    fetchCalls.push({
      httpHeaders: { ...(opts.headers || {}) },
      body: JSON.parse(opts.body),
    });
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: `re_mock_${fetchCalls.length}` }),
    };
  };
  const emailLib = require('../src/lib/email');
  const originalSend = emailLib.sendEmail;
  let crashOnce = true;
  emailLib.sendEmail = async (opts) => {
    const result = await originalSend(opts);
    if (crashOnce) {
      crashOnce = false;
      throw new Error('simulated crash after provider acceptance');
    }
    return result;
  };
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const family = await seedFamily(db, {
      email: `followup-${uniqueSuffix()}@acme.se`,
    });
    await seedPending({ db, family, daysAgo: 8 });
    const batch = await followup.createBatch();
    await followup.prepareFromPending(batch.id, { maxRecipients: 10 });
    const recipients = await followup.listRecipients(batch.id);
    assert.equal(recipients.length, 1);
    const expectedKey = followup.followupIdempotencyKey(batch.id, recipients[0].id);

    const first = await withSendEnabled(() => followup.sendBatch(batch.id));
    assert.equal(first.sent, 0);
    assert.equal(first.failed, 1);
    assert.equal(first.batch_status, 'failed');
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].httpHeaders['Idempotency-Key'], expectedKey);
    assert.equal(fetchCalls[0].httpHeaders['Content-Type'], 'application/json');
    assert.equal(fetchCalls[0].httpHeaders.Authorization, 'Bearer re_test_followup_idempotency');
    assert.match(fetchCalls[0].body.headers['List-Unsubscribe'], /^<https?:\/\//);
    assert.equal(fetchCalls[0].body.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
    assert.equal(fetchCalls[0].body.headers['Idempotency-Key'], undefined);

    const retry = await withSendEnabled(() => followup.sendBatch(batch.id));
    assert.equal(retry.sent, 1);
    assert.equal(retry.failed, 0);
    assert.equal(retry.batch_status, 'sent');
    assert.equal(fetchCalls.length, 2);
    assert.equal(fetchCalls[1].httpHeaders['Idempotency-Key'], expectedKey);
    assert.equal(fetchCalls[0].httpHeaders['Idempotency-Key'], fetchCalls[1].httpHeaders['Idempotency-Key']);
    assert.equal(fetchCalls[1].body.headers['Idempotency-Key'], undefined);
    assert.equal(
      fetchCalls[1].body.headers['List-Unsubscribe'],
      fetchCalls[0].body.headers['List-Unsubscribe']
    );
  } finally {
    emailLib.sendEmail = originalSend;
    global.fetch = originalFetch;
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
    await db.cleanup();
  }
});
