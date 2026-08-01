#!/usr/bin/env node
'use strict';

/**
 * Idempotent RC-1 QA family prepare/reset (DB only — no welcome email).
 *
 * Env:
 *   DATABASE_URL (required)
 *   RC1_QA_EMAIL (must match allowlisted fixture email)
 *   RC1_QA_PASSWORD (parent login password — synced to DB)
 *   RC1_CHILD_PIN (4 digits — child PIN)
 *   RC1_PARENT_PIN (4 digits — parent app-lock)
 *   RC1_PIN_FINGERPRINT_KEY (optional — HMAC key for smoke fingerprint)
 *   RC1_QA_FAMILY_ID (optional — refuse if mismatch after prepare)
 *
 * Usage:
 *   npm run rc1:qa:prepare
 *   npm run rc1:qa:prepare -- --dry-run
 */

const crypto = require('node:crypto');
const db = require('../src/lib/db');
const { hashPassword } = require('../src/lib/hash');
const parentPinDb = require('../db/parent-pin');
const {
  RC1_QA_FAMILY_NAME,
  RC1_QA_PARENT_EMAIL,
  RC1_QA_CHILD_DISPLAY_NAME,
  RC1_QA_CHILD_USERNAME,
  assertRc1QaFixtureEmail,
  normalizeEmail,
  isRc1QaEmailDomain,
} = require('../src/lib/rc1-qa-fixture');
const { pinFingerprint } = require('../src/lib/rc1-pin-fingerprint');

const dryRun = process.argv.includes('--dry-run');

const ACTIVITIES = [
  ['Wake up', '⏰', 1, 'morgon'],
  ['Brush teeth', '🪥', 1, 'morgon'],
  ['School', '🏫', 2, 'dag'],
  ['Dinner', '🍽️', 1, 'kvall'],
  ['Bedtime', '🌙', 1, 'kvall'],
];

const REWARDS = [
  ['Screen time', '📺', 15],
  ['Ice cream', '🍦', 10],
];

function requireEnv(name, pattern) {
  const v = process.env[name];
  if (!v) {
    console.error(`[rc1-qa-prepare] missing ${name}`);
    process.exit(1);
  }
  if (pattern && !pattern.test(v)) {
    console.error(`[rc1-qa-prepare] invalid ${name} format`);
    process.exit(1);
  }
  return v;
}

function stockholmToday(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(d);
}

async function wipeFamilyContent(client, familyId) {
  await client.query(
    `DELETE FROM daily_log_item WHERE daily_log_id IN
       (SELECT id FROM daily_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1))`,
    [familyId]
  );
  await client.query(
    'DELETE FROM daily_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)',
    [familyId]
  );
  await client.query(
    'DELETE FROM reward_redemption WHERE reward_id IN (SELECT id FROM reward WHERE family_id = $1)',
    [familyId]
  );
  await client.query('DELETE FROM reward WHERE family_id = $1', [familyId]);
  await client.query(
    `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN
       (SELECT id FROM weekly_schedule WHERE family_id = $1)`,
    [familyId]
  );
  await client.query('DELETE FROM weekly_schedule WHERE family_id = $1', [familyId]);
  await client.query(
    `DELETE FROM activity_sub_step WHERE activity_template_id IN
       (SELECT id FROM activity_template WHERE family_id = $1)`,
    [familyId]
  );
  await client.query('DELETE FROM activity_template WHERE family_id = $1', [familyId]);
}

async function clearSessionsAndHandoff(client, familyId) {
  await client.query('DELETE FROM parent_session_handoff WHERE family_id = $1', [familyId]);
  await client.query(
    `DELETE FROM refresh_token WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)
       OR child_id IN (SELECT id FROM child WHERE family_id = $1)`,
    [familyId]
  );
  await client.query(
    'DELETE FROM pin_lockout WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)',
    [familyId]
  );
}

async function main() {
  const qaEmail = dryRun
    ? normalizeEmail(RC1_QA_PARENT_EMAIL)
    : normalizeEmail(process.env.RC1_QA_EMAIL || RC1_QA_PARENT_EMAIL);

  if (!dryRun) {
    assertRc1QaFixtureEmail(qaEmail);
    if (!isRc1QaEmailDomain(qaEmail)) {
      throw new Error('RC1 QA prepare: email domain guard failed');
    }
  }

  if (dryRun) {
    console.log(JSON.stringify({
      dry_run: true,
      actions: [
        'upsert QA family by allowlisted email only',
        'set en-GB locale + english_app + english_child_experience',
        'ensure lifetime_free subscription without reporting component',
        'set parent password hash + parent app-lock PIN hash',
        'set child username/PIN',
        'wipe and reseed minimal schedule/rewards/today log',
        'clear handoff rows + refresh tokens + child pin lockout for QA family',
      ],
      qa_email_domain: qaEmail.split('@')[1],
      child_username: RC1_QA_CHILD_USERNAME,
    }));
    process.exit(0);
  }

  if (!process.env.DATABASE_URL) {
    console.error('[rc1-qa-prepare] DATABASE_URL required');
    process.exit(1);
  }

  const parentPassword = requireEnv('RC1_QA_PASSWORD');
  const childPin = requireEnv('RC1_CHILD_PIN', /^\d{4}$/);
  const parentPin = requireEnv('RC1_PARENT_PIN', /^\d{4}$/);
  const expectedFamilyId = (process.env.RC1_QA_FAMILY_ID || '').trim() || null;

  const passwordHash = await hashPassword(parentPassword);
  const childPinHash = await hashPassword(childPin);
  const parentPinHash = await hashPassword(parentPin);

  const client = await db.getClient();
  let familyId;
  let parentId;
  let childId;

  try {
    await client.query('BEGIN');

    const existingParents = await client.query(
      'SELECT id, family_id FROM parent WHERE LOWER(email) = LOWER($1)',
      [qaEmail]
    );
    if (existingParents.rows.length > 1) {
      throw new Error('RC1 QA prepare: multiple parents match fixture email');
    }

    if (existingParents.rows.length === 1) {
      parentId = existingParents.rows[0].id;
      familyId = existingParents.rows[0].family_id;
      await client.query(
        `UPDATE family SET name = $1, timezone = 'Europe/Stockholm', preferred_locale = 'en-GB',
           locale_selection_source = 'admin', locale_selected_at = NOW(), is_lifetime_free = true
         WHERE id = $2`,
        [RC1_QA_FAMILY_NAME, familyId]
      );
      await client.query(
        `UPDATE parent SET password_hash = $1, name = 'RC1 QA Parent', verified = true, onboarding_completed = true
         WHERE id = $2`,
        [passwordHash, parentId]
      );
    } else {
      const fam = await client.query(
        `INSERT INTO family (name, timezone, preferred_locale, locale_selection_source, locale_selected_at, is_lifetime_free)
         VALUES ($1, 'Europe/Stockholm', 'en-GB', 'admin', NOW(), true) RETURNING id`,
        [RC1_QA_FAMILY_NAME]
      );
      familyId = fam.rows[0].id;
      const par = await client.query(
        `INSERT INTO parent (family_id, email, password_hash, name, verified, onboarding_completed)
         VALUES ($1, $2, $3, 'RC1 QA Parent', true, true) RETURNING id`,
        [familyId, qaEmail, passwordHash]
      );
      parentId = par.rows[0].id;
    }

    const famCheck = await client.query('SELECT name FROM family WHERE id = $1', [familyId]);
    if (famCheck.rows[0]?.name !== RC1_QA_FAMILY_NAME) {
      throw new Error('RC1 QA prepare: family name guard failed — not a QA fixture');
    }

    if (expectedFamilyId && expectedFamilyId !== familyId) {
      throw new Error('RC1 QA prepare: RC1_QA_FAMILY_ID does not match resolved fixture family');
    }

    for (const slug of ['english_app', 'english_child_experience']) {
      await client.query(
        `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, $2)
         ON CONFLICT (family_id, feature_slug) DO NOTHING`,
        [familyId, slug]
      );
    }

    await client.query(
      `INSERT INTO family_subscriptions (family_id, tier, trial_expires_at, components)
       VALUES ($1, 'lifetime_free', NULL, $2::jsonb)
       ON CONFLICT (family_id) DO UPDATE SET
         tier = EXCLUDED.tier,
         components = EXCLUDED.components`,
      [
        familyId,
        JSON.stringify([{ slug: 'basic_app', has: true }]),
      ]
    );

    await client.query(
      'UPDATE parent SET parent_pin_hash = $1, updated_at = NOW() WHERE id = $2',
      [parentPinHash, parentId]
    );

    await clearSessionsAndHandoff(client, familyId);
    await wipeFamilyContent(client, familyId);

    const childRow = await client.query(
      'SELECT id FROM child WHERE family_id = $1 AND username = $2',
      [familyId, RC1_QA_CHILD_USERNAME]
    );
    if (childRow.rows.length > 1) {
      throw new Error('RC1 QA prepare: duplicate child username in QA family');
    }
    if (childRow.rows.length === 1) {
      childId = childRow.rows[0].id;
      await client.query(
        `UPDATE child SET name = $1, emoji = '⭐', birthday = '2018-01-15', pin = $2 WHERE id = $3`,
        [RC1_QA_CHILD_DISPLAY_NAME, childPinHash, childId]
      );
    } else {
      const ch = await client.query(
        `INSERT INTO child (family_id, name, emoji, birthday, username, pin)
         VALUES ($1, $2, '⭐', '2018-01-15', $3, $4) RETURNING id`,
        [familyId, RC1_QA_CHILD_DISPLAY_NAME, RC1_QA_CHILD_USERNAME, childPinHash]
      );
      childId = ch.rows[0].id;
    }

    await client.query(
      `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')
       ON CONFLICT DO NOTHING`,
      [parentId, childId]
    );

    const activityIds = {};
    for (const [i, [name, icon, stars, section]] of ACTIVITIES.entries()) {
      const act = await client.query(
        `INSERT INTO activity_template (family_id, name, icon, star_value, time_group, sort_order, source)
         VALUES ($1, $2, $3, $4, $5, $6, 'user') RETURNING id`,
        [familyId, name, icon, stars, section, i]
      );
      activityIds[name] = act.rows[0].id;
    }

    for (const dow of [1, 2, 3, 4, 5]) {
      const sched = await client.query(
        'INSERT INTO weekly_schedule (child_id, family_id, day_of_week) VALUES ($1, $2, $3) RETURNING id',
        [childId, familyId, dow]
      );
      let sort = 0;
      for (const [name] of ACTIVITIES) {
        const section = ACTIVITIES.find((a) => a[0] === name)[3];
        await client.query(
          `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
           VALUES ($1, $2, $3, $4)`,
          [sched.rows[0].id, activityIds[name], sort++, section]
        );
      }
    }

    const today = stockholmToday(0);
    const log = await client.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, today]
    );
    let sort = 0;
    for (const [name, icon, stars, section] of ACTIVITIES) {
      const done = section === 'morgon';
      await client.query(
        `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, section,
           sort_order, completed, completed_at, completed_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          log.rows[0].id, activityIds[name], name, icon, stars, section, sort++,
          done, done ? new Date() : null, today,
        ]
      );
    }

    for (const [i, [name, icon, cost]] of REWARDS.entries()) {
      await client.query(
        'INSERT INTO reward (family_id, name, icon, star_cost, sort_order) VALUES ($1, $2, $3, $4, $5)',
        [familyId, name, icon, cost, i]
      );
    }

    await client.query('COMMIT');

    const pinOk = await parentPinDb.verifyParentPin({ familyId, parentId, pin: parentPin });
    if (!pinOk.ok) {
      throw new Error('RC1 QA prepare: parent PIN verification failed after set (fixture misconfiguration)');
    }

    const fpKey = process.env.RC1_PIN_FINGERPRINT_KEY;
    if (!fpKey) {
      throw new Error('RC1_PIN_FINGERPRINT_KEY required for QA prepare');
    }
    const fingerprint = pinFingerprint(parentPin, fpKey);

    console.log(JSON.stringify({
      ok: true,
      family_id: familyId,
      parent_id: parentId,
      child_id: childId,
      child_username: RC1_QA_CHILD_USERNAME,
      preferred_locale: 'en-GB',
      english_child_experience: true,
      reporting_component: false,
      parent_pin_configured: true,
      pin_fingerprint: fingerprint,
      pin_fingerprint_key_id: 'env',
    }));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[rc1-qa-prepare]', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.pool.end().catch(() => {});
    process.exit(process.exitCode || 0);
  }
}

main();
