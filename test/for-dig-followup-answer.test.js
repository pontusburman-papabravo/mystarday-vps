'use strict';

/**
 * 1-click För dig follow-up answers — signed token, GET never writes.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { setupTestDb } = require('./helpers/setup.js');
const { FOR_DIG_GOALS } = require('../src/lib/for-dig-config');
const {
  signAnswerToken,
  verifyAnswerToken,
  buildAnswerUrl,
  ANSWER_PATH,
} = require('../src/lib/for-dig-followup-answer-token');

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
const OTHER_GOAL = FOR_DIG_GOALS[1].slug;

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedFamily(db, { email, childName, parentName } = {}) {
  const suffix = uniqueSuffix();
  const fam = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free)
     VALUES ($1, 'Europe/Stockholm', true) RETURNING id`,
    [`Answer ${suffix}`]
  );
  const familyId = fam.rows[0].id;
  const parent = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, 'hash', $2, $3, true, true) RETURNING id`,
    [email || `answer-${suffix}@example.com`, familyId, parentName || 'Anna']
  );
  const parentId = parent.rows[0].id;
  const child = await db.query(
    `INSERT INTO child (family_id, name, emoji, username)
     VALUES ($1, $2, '⭐', $3) RETURNING id`,
    [familyId, childName || 'Astrid', `ans${suffix}`]
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
    email: email || `answer-${suffix}@example.com`,
  };
}

async function seedPending(db, family, { daysAgo = 8, goalSlug = GOAL_SLUG } = {}) {
  await db.query(
    `INSERT INTO for_dig_goal_install (goal_slug, family_id, child_id, parent_id, installed_at)
     VALUES ($1, $2, $3, $4, NOW() - ($5::int || ' days')::interval)
     ON CONFLICT (goal_slug, family_id, child_id)
     DO UPDATE SET installed_at = EXCLUDED.installed_at, parent_id = EXCLUDED.parent_id`,
    [goalSlug, family.familyId, family.childId, family.parentId, daysAgo]
  );
  await db.query(
    `INSERT INTO for_dig_goal_feedback
       (family_id, parent_id, child_id, goal_slug, phase, intent_reason)
     VALUES ($1, $2, $3, $4, 'intent', 'tydligare_rutiner')
     ON CONFLICT DO NOTHING`,
    [family.familyId, family.parentId, family.childId, goalSlug]
  );
}

async function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on('error', reject);
  });
}

function answerApp() {
  const app = express();
  app.use(require('../src/routes/for-dig-followup-answer'));
  return app;
}

async function countOutcomes(db, family) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS n FROM for_dig_goal_feedback
      WHERE family_id = $1 AND child_id = $2 AND goal_slug = $3 AND phase = 'outcome'`,
    [family.familyId, family.childId, GOAL_SLUG]
  );
  return result.rows[0].n;
}

test('answer token is HMAC-signed and hides parent identity', () => {
  const recipientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const email = 'hidden-parent@example.com';
  const url = buildAnswerUrl(recipientId, { baseUrl: 'https://example.test', score: 3 });
  assert.match(url, new RegExp(`https://example\\.test${ANSWER_PATH}\\?`));
  assert.match(url, /score=3/);
  assert.doesNotMatch(url, new RegExp(email, 'i'));
  assert.doesNotMatch(url, /parent_id/i);
  const verified = verifyAnswerToken(signAnswerToken(recipientId));
  assert.equal(verified.ok, true);
  assert.equal(verified.recipientId, recipientId);
  assert.equal(verifyAnswerToken('fdq1.not-a-uuid.sig').ok, false);
  assert.equal(verifyAnswerToken(signAnswerToken(recipientId).replace(/.$/, 'x')).ok, false);
});

test('GET never writes; POST records one outcome and can continue to next item', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  const server = await listen(answerApp());
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const family = await seedFamily(db);
    await seedPending(db, family, { goalSlug: GOAL_SLUG, daysAgo: 12 });
    await seedPending(db, family, { goalSlug: OTHER_GOAL, daysAgo: 8 });
    const batch = await followup.createBatch();
    await followup.prepareFromPending(batch.id);
    const recipients = await followup.listRecipients(batch.id);
    assert.equal(recipients.length, 1);
    const recipient = recipients[0];
    assert.equal(recipient.items.length >= 2, true);
    const token = signAnswerToken(recipient.id);
    const port = server.address().port;
    const origin = `http://127.0.0.1:${port}`;

    const preview = await followup.previewBatch(batch.id);
    assert.equal(preview.previews[0].template, 'one_question');
    assert.match(preview.previews[0].cta_url, /\/for-dig\/hur-gick-det\?/);
    assert.match(preview.previews[0].html, /Stor förbättring/);
    assert.match(preview.previews[0].html, new RegExp(FOR_DIG_GOALS[0].title));
    assert.match(preview.previews[0].subject, new RegExp(FOR_DIG_GOALS[0].title));
    assert.doesNotMatch(preview.previews[0].html, /några saker/);
    assert.doesNotMatch(preview.previews[0].html, /Öppna /);

    const getRes = await fetch(`${origin}${ANSWER_PATH}?t=${encodeURIComponent(token)}&score=4`);
    assert.equal(getRes.status, 200);
    const getBody = await getRes.text();
    assert.match(getBody, /Bekräfta/);
    assert.match(getBody, /Stor förbättring/);
    assert.equal(await countOutcomes(db, family), 0);

    const firstItem = recipient.items[0];
    const postRes = await fetch(`${origin}${ANSWER_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        t: token,
        child_id: firstItem.child_id,
        goal_slug: firstItem.goal_slug,
        score: '3',
      }).toString(),
    });
    assert.equal(postRes.status, 200);
    const postBody = await postRes.text();
    assert.match(postBody, /Tack/);
    assert.match(postBody, /nästa fråga|det räcker/);
    const outcomes = await db.query(
      `SELECT outcome_score, goal_slug FROM for_dig_goal_feedback
        WHERE family_id = $1 AND phase = 'outcome' ORDER BY created_at ASC`,
      [family.familyId]
    );
    assert.equal(outcomes.rowCount, 1);
    assert.equal(outcomes.rows[0].outcome_score, 3);
    assert.equal(outcomes.rows[0].goal_slug, firstItem.goal_slug);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await db.cleanup();
  }
});

test('answer token for parent A cannot write parent B; invalid token writes nothing', async () => {
  const db = await setupTestDb();
  assert.equal(db.skip, false, 'TEST_DATABASE_URL required');
  const server = await listen(answerApp());
  try {
    const followup = require('../db/for-dig-outcome-followup');
    const a = await seedFamily(db, { parentName: 'Ada' });
    const b = await seedFamily(db, { parentName: 'Bo' });
    await seedPending(db, a);
    await seedPending(db, b);
    const batch = await followup.createBatch();
    await followup.prepareFromPending(batch.id, { maxRecipients: 10 });
    const recipients = await followup.listRecipients(batch.id);
    const recA = recipients.find((row) => row.parent_id === a.parentId);
    const recB = recipients.find((row) => row.parent_id === b.parentId);
    assert.ok(recA && recB);
    const tokenA = signAnswerToken(recA.id);
    const port = server.address().port;
    const origin = `http://127.0.0.1:${port}`;

    const stolen = await fetch(`${origin}${ANSWER_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        t: tokenA,
        child_id: recB.items[0].child_id,
        goal_slug: recB.items[0].goal_slug,
        score: '4',
      }).toString(),
    });
    assert.equal(stolen.status, 400);
    assert.equal(await countOutcomes(db, b), 0);
    assert.equal(await countOutcomes(db, a), 0);

    const bad = await fetch(`${origin}${ANSWER_PATH}?t=not-a-token`);
    assert.equal(bad.status, 400);
    const badPost = await fetch(`${origin}${ANSWER_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        t: 'not-a-token',
        child_id: recA.items[0].child_id,
        goal_slug: recA.items[0].goal_slug,
        score: '4',
      }).toString(),
    });
    assert.equal(badPost.status, 400);
    assert.equal(await countOutcomes(db, a), 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await db.cleanup();
  }
});
