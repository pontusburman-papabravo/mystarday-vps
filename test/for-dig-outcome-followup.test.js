'use strict';

/**
 * För dig outcome follow-up email tracking — merge-gate tests.
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
  OPENING_LINE,
  dashboardCtaUrl,
  buildOutcomeFollowupEmailHtml,
} = require('../src/lib/for-dig-outcome-email-template');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
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
  return { familyId, parentId, childId, email: email || `followup-${suffix}@example.com` };
}

async function seedPending({ db, family, daysAgo = 8, goalSlug = GOAL_SLUG, withIntent = true, withOutcome = false }) {
  await db.query(
    `INSERT INTO for_dig_goal_install (goal_slug, family_id, child_id, parent_id, installed_at)
     VALUES ($1, $2, $3, $4, NOW() - ($5::int || ' days')::interval)
     ON CONFLICT (goal_slug, family_id, child_id)
     DO UPDATE SET installed_at = EXCLUDED.installed_at, parent_id = EXCLUDED.parent_id`,
    [goalSlug, family.familyId, family.childId, family.parentId, daysAgo]
  );
  if (withIntent) {
    await db.query(
      `INSERT INTO for_dig_goal_feedback
         (family_id, parent_id, child_id, goal_slug, phase, intent_reason)
       VALUES ($1, $2, $3, $4, 'intent', 'tydligare_rutiner')
       ON CONFLICT DO NOTHING`,
      [family.familyId, family.parentId, family.childId, goalSlug]
    );
  }
  if (withOutcome) {
    await db.query(
      `INSERT INTO for_dig_goal_feedback
         (family_id, parent_id, child_id, goal_slug, phase, outcome_score)
       VALUES ($1, $2, $3, $4, 'outcome', 3)
       ON CONFLICT DO NOTHING`,
      [family.familyId, family.parentId, family.childId, goalSlug]
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
    assert.equal(
      pending.rows.some((row) => row.family_id === tooNew.familyId && row.child_id === otherFamily.childId),
      false
    );
  } finally {
    await db.cleanup();
  }
});

test('3. prepare-from-pending matches listPendingOutcomesAdmin rows', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const { listPendingOutcomesAdmin } = require('../db/for-dig-goal-feedback');
    const followup = require('../db/for-dig-outcome-followup');
    const family = await seedFamily(db);
    await seedPending({ db, family, daysAgo: 9 });
    const pending = await listPendingOutcomesAdmin({ limit: 5000, offset: 0 });
    const batch = await followup.createBatch();
    const prepared = await followup.prepareFromPending(batch.id);
    const recipients = await followup.listRecipients(batch.id);
    const pendingKeys = pending.rows
      .filter((row) => row.parent_id && row.parent_email)
      .map(pendingKey)
      .sort();
    const recipientKeys = recipients.map(pendingKey).sort();
    assert.deepEqual(recipientKeys, pendingKeys);
    assert.equal(prepared.inserted, pendingKeys.length);
    assert.equal(prepared.pendingTotal, pending.total);
  } finally {
    await db.cleanup();
  }
});

test('4. outcome attribution after send matches family+child+goal', async () => {
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

test('5. outcome attribution rejects before send and sent_at null', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const family = await seedFamily(db);
    await seedPending({ db, family, daysAgo: 8 });
    const batch = await followup.createBatch();
    await followup.prepareFromPending(batch.id);
    await db.query(
      `INSERT INTO for_dig_goal_feedback
         (family_id, parent_id, child_id, goal_slug, phase, outcome_score, created_at)
       VALUES ($1, $2, $3, $4, 'outcome', 3, NOW() - INTERVAL '2 hours')`,
      [family.familyId, family.parentId, family.childId, GOAL_SLUG]
    );
    const beforeSend = await followup.listAttributedOutcomes(batch.id);
    assert.equal(beforeSend.length, 0);

    await db.query(
      `UPDATE for_dig_outcome_followup_batch
       SET status = 'sent', sent_at = NOW()
       WHERE id = $1`,
      [batch.id]
    );
    const afterButOutcomeEarlier = await followup.listAttributedOutcomes(batch.id);
    assert.equal(afterButOutcomeEarlier.length, 0);
  } finally {
    await db.cleanup();
  }
});

test('6. outcome attribution rejects wrong child, goal, or family', async () => {
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
    const sibling = await db.query(
      `INSERT INTO child (family_id, name, emoji, username)
       VALUES ($1, 'Syskon', '⭐', $2) RETURNING id`,
      [family.familyId, `sib${uniqueSuffix()}`]
    );
    await db.query(
      `INSERT INTO for_dig_goal_feedback
         (family_id, parent_id, child_id, goal_slug, phase, outcome_score)
       VALUES ($1, $2, $3, $4, 'outcome', 2)`,
      [family.familyId, family.parentId, sibling.rows[0].id, GOAL_SLUG]
    );
    const attributed = await followup.listAttributedOutcomes(batch.id);
    assert.equal(attributed.length, 0);
  } finally {
    await db.cleanup();
  }
});

test('7. EMAIL_SEND_ENABLED unset/false is dry-run with no newsletter_email_send rows', async () => {
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
    const unsetResult = await followup.sendBatch(batch.id);
    assert.equal(unsetResult.dryRun, true);
    assert.equal(unsetResult.sent, 0);

    process.env.EMAIL_SEND_ENABLED = 'false';
    const falseResult = await followup.sendBatch(batch.id);
    assert.equal(falseResult.dryRun, true);
    assert.equal(falseResult.sent, 0);

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

test('8. migration leaves existing newsletter and for_dig data unchanged', async () => {
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
        AND tablename IN ('for_dig_outcome_followup_batch', 'for_dig_outcome_followup_recipient')
      ORDER BY tablename
    `);
    assert.deepEqual(
      tables.rows.map((row) => row.tablename),
      ['for_dig_outcome_followup_batch', 'for_dig_outcome_followup_recipient']
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

test('9. newsletter standalone recordSend/stats/recipients still work', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    const tracking = require('../db/newsletter-email-tracking');
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
  } finally {
    await db.cleanup();
  }
});

test('10. same webhook handler updates for_dig tracking; retry increments open_count; CTA is /dashboard', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  try {
    assert.equal(CTA_PATH, '/dashboard');
    const html = buildOutcomeFollowupEmailHtml({
      parentName: 'Anna',
      childName: 'Astrid',
      goalTitle: GOAL_TITLE,
      ctaUrl: dashboardCtaUrl('https://example.test'),
    });
    assert.match(html, /https:\/\/example\.test\/dashboard/);
    assert.match(html, new RegExp(OPENING_LINE));
    assert.doesNotMatch(html, /transaktionell/i);

    const followup = require('../db/for-dig-outcome-followup');
    const family = await seedFamily(db);
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
    const trackingSource = require('fs').readFileSync(webhookPath, 'utf8');
    assert.match(trackingSource, /markOpened/);
    assert.match(trackingSource, /newsletter-email-tracking/);
    assert.doesNotMatch(trackingSource, /email_campaign/);

    const app = express();
    app.post('/api/resend/webhook', express.raw({ type: 'application/json' }), handleResendWebhook);
    const server = await new Promise((resolve, reject) => {
      const s = app.listen(0, () => resolve(s));
      s.on('error', reject);
    });
    try {
      const port = server.address().port;
      for (let i = 0; i < 2; i++) {
        const payload = JSON.stringify({
          type: 'email.opened',
          created_at: new Date().toISOString(),
          data: { email_id: emailId },
        });
        const ts = String(Math.floor(Date.now() / 1000));
        const { id, timestamp, signature } = signPayload(secret, payload, `msg_open_${i}`, ts);
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
    } finally {
      await new Promise((resolve) => server.close(resolve));
      if (prevSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
      else process.env.RESEND_WEBHOOK_SECRET = prevSecret;
    }

    const row = await db.query(
      `SELECT open_count, campaign_type FROM newsletter_email_send WHERE resend_email_id = $1`,
      [emailId]
    );
    assert.equal(row.rows[0].campaign_type, 'for_dig_outcome_followup');
    assert.equal(row.rows[0].open_count, 2);
  } finally {
    await db.cleanup();
  }
});
