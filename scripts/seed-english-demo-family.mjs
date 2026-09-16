#!/usr/bin/env node
'use strict';

/**
 * Seed (or reset) the English demo/QA family — for App Store / Google Play
 * screenshots, marketing material and internal QA.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/seed-english-demo-family.mjs
 *   npm run seed:english-demo
 *
 * Demo identity (documented — NOT a real customer):
 *   Parent email : english.demo@mystarday.se  (pragma: allowlist secret)
 *   Family name  : English Demo (QA)
 *   Child        : Emma 🦄
 *
 * Credentials are NEVER stored in the repo:
 *   - parent password: env DEMO_FAMILY_PASSWORD, otherwise randomly generated
 *     and printed once at the end of the run
 *   - child PIN: env DEMO_CHILD_PIN (4 digits), otherwise randomly generated
 *     and printed once
 *
 * Safety rails:
 *   - writes directly to the DB — no registration API call, so no welcome
 *     email, verification email or push notification is ever triggered
 *   - idempotent: family/parent/child are upserted by the demo email; all
 *     demo CONTENT (activities, categories, schedules, logs, rewards) is
 *     wiped and reseeded deterministically on every run
 *   - only ever touches the family owned by the demo email
 *   - `preferred_locale = 'en-GB'`, `locale_selection_source = 'admin'`,
 *     english_app + english_child_experience feature flags enabled,
 *     `is_lifetime_free = true` (no paywall), timezone Europe/London
 *   - contains no real personal data and no Swedish display names
 *   - analytics: there is no dedicated demo/test marker in analytics_events
 *     today — exclude this family by its documented email/family name when
 *     analysing metrics
 */

import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../src/lib/db');
const familySubscriptions = require('../db/family-subscriptions');
const { hashPassword } = require('../src/lib/hash');

const DEMO_EMAIL = 'english.demo@mystarday.se'; // pragma: allowlist secret
const DEMO_FAMILY_NAME = 'English Demo (QA)';
const DEMO_PARENT_NAME = 'Demo Parent';
const DEMO_CHILD = { name: 'Emma', emoji: '🦄', birthday: '2018-05-12', username: 'emma-demo' };

const CATEGORIES = ['Morning', 'Afternoon', 'Evening'];

/** [name, icon, stars, section, category, subSteps?] */
const ACTIVITIES = [
  ['Wake up', '⏰', 1, 'morgon', 'Morning'],
  ['Make the bed', '🛏️', 1, 'morgon', 'Morning'],
  ['Get dressed', '👕', 1, 'morgon', 'Morning'],
  ['Brush teeth', '🪥', 1, 'morgon', 'Morning', ['Toothpaste on the brush', 'Brush for 2 minutes', 'Rinse']],
  ['Eat breakfast', '🥣', 1, 'morgon', 'Morning'],
  ['Pack school bag', '🎒', 2, 'morgon', 'Morning', ['Books and homework', 'Water bottle', 'Gym kit if needed']],
  ['School', '🏫', 2, 'dag', 'Afternoon'],
  ['Snack', '🍎', 1, 'dag', 'Afternoon'],
  ['Homework', '📚', 3, 'dag', 'Afternoon'],
  ['Free play', '🧩', 1, 'dag', 'Afternoon'],
  ['Outdoor time', '🌳', 2, 'dag', 'Afternoon'],
  ['Dinner', '🍽️', 1, 'kvall', 'Evening'],
  ['Tidy room', '🧹', 2, 'kvall', 'Evening'],
  ['Shower', '🚿', 1, 'kvall', 'Evening'],
  ['Brush teeth (evening)', '🪥', 1, 'kvall', 'Evening'],
  ['Read', '📖', 2, 'kvall', 'Evening'],
  ['Bedtime', '🌙', 1, 'kvall', 'Evening'],
];

const WEEKDAY_ONLY = new Set(['School', 'Homework', 'Pack school bag']);

const REWARDS = [
  ['Movie night with popcorn', '🎬', 25],
  ['Restaurant visit', '🍽️', 30],
  ['Trip to the playground', '🛝', 15],
  ['Choose Saturday dinner', '🍕', 20],
];

/** TEACCH overlay for store screenshots — English-only user content. */
const BRUSH_TEETH_SEVEN_QUESTIONS = {
  where: { text: 'Bathroom', emoji: '🚿' },
  who: { text: 'Me', emoji: '🙂' },
  how_long: { text: '2 minutes', minutes: 2 },
  what_next: { text: 'Get dressed', emoji: '👕' },
  what_need: { text: 'Toothbrush and toothpaste', emoji: '🪥' },
  why: { text: 'Clean teeth keep us healthy', emoji: '✨' },
};

/** First incomplete activity on "today" for morning-routine store shot. */
const TODAY_DONE_ACTIVITIES = new Set(['Wake up', 'Make the bed', 'Get dressed']);

function randomPassword() {
  return `Demo-${crypto.randomBytes(9).toString('base64url')}`;
}

function randomPin() {
  return String(crypto.randomInt(1000, 10000));
}

function londonToday(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/London' }).format(d); // YYYY-MM-DD
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const password = process.env.DEMO_FAMILY_PASSWORD || randomPassword();
  const pin = /^\d{4}$/.test(process.env.DEMO_CHILD_PIN || '') ? process.env.DEMO_CHILD_PIN : randomPin();
  const passwordHash = await hashPassword(password);
  const pinHash = await hashPassword(pin);

  const client = await db.getClient();
  let familyId;
  try {
    await client.query('BEGIN');

    // ── Family + parent (upsert by demo email) ──
    let parentId;
    const existing = await client.query(
      'SELECT id, family_id FROM parent WHERE LOWER(email) = LOWER($1)',
      [DEMO_EMAIL]
    );
    if (existing.rows.length > 0) {
      parentId = existing.rows[0].id;
      familyId = existing.rows[0].family_id;
      await client.query(
        `UPDATE family SET name = $1, timezone = 'Europe/London', preferred_locale = 'en-GB',
           locale_selection_source = 'admin', locale_selected_at = NOW(), is_lifetime_free = true
         WHERE id = $2`,
        [DEMO_FAMILY_NAME, familyId]
      );
      await client.query(
        `UPDATE parent SET password_hash = $1, name = $2, verified = true, onboarding_completed = true
         WHERE id = $3`,
        [passwordHash, DEMO_PARENT_NAME, parentId]
      );
    } else {
      const fam = await client.query(
        `INSERT INTO family (name, timezone, preferred_locale, locale_selection_source, locale_selected_at, is_lifetime_free)
         VALUES ($1, 'Europe/London', 'en-GB', 'admin', NOW(), true) RETURNING id`,
        [DEMO_FAMILY_NAME]
      );
      familyId = fam.rows[0].id;
      const par = await client.query(
        `INSERT INTO parent (family_id, email, password_hash, name, verified, onboarding_completed)
         VALUES ($1, $2, $3, $4, true, true) RETURNING id`,
        [familyId, DEMO_EMAIL, passwordHash, DEMO_PARENT_NAME]
      );
      parentId = par.rows[0].id;
    }

    // ── English feature flags ──
    for (const slug of ['english_app', 'english_child_experience']) {
      await client.query(
        `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, $2)
         ON CONFLICT (family_id, feature_slug) DO NOTHING`,
        [familyId, slug]
      );
    }

    // ── Wipe existing demo content (idempotent reset) ──
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
    await client.query('DELETE FROM category WHERE family_id = $1', [familyId]);

    // ── Child (upsert by name within demo family) ──
    let childId;
    const childRow = await client.query(
      'SELECT id FROM child WHERE family_id = $1 AND name = $2',
      [familyId, DEMO_CHILD.name]
    );
    if (childRow.rows.length > 0) {
      childId = childRow.rows[0].id;
      await client.query(
        `UPDATE child SET emoji = $1, birthday = $2, username = $3, pin = $4,
           show_now_next = true, view_type = 'now_next_later' WHERE id = $5`,
        [DEMO_CHILD.emoji, DEMO_CHILD.birthday, DEMO_CHILD.username, pinHash, childId]
      );
    } else {
      const ch = await client.query(
        `INSERT INTO child (family_id, name, emoji, birthday, username, pin, show_now_next, view_type)
         VALUES ($1, $2, $3, $4, $5, $6, true, 'now_next_later') RETURNING id`,
        [familyId, DEMO_CHILD.name, DEMO_CHILD.emoji, DEMO_CHILD.birthday, DEMO_CHILD.username, pinHash]
      );
      childId = ch.rows[0].id;
    }
    await client.query(
      `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')
       ON CONFLICT DO NOTHING`,
      [parentId, childId]
    );

    // ── Categories + activities + sub-steps ──
    const categoryIds = {};
    for (const [i, name] of CATEGORIES.entries()) {
      const cat = await client.query(
        'INSERT INTO category (family_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id',
        [familyId, name, i]
      );
      categoryIds[name] = cat.rows[0].id;
    }

    const activityIds = {};
    for (const [i, [name, icon, stars, section, category, subSteps]] of ACTIVITIES.entries()) {
      const act = await client.query(
        `INSERT INTO activity_template (family_id, category_id, name, icon, star_value, time_group, sort_order, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'user') RETURNING id`,
        [familyId, categoryIds[category], name, icon, stars, section, i]
      );
      activityIds[name] = act.rows[0].id;
      if (name === 'Brush teeth') {
        await client.query(
          `UPDATE activity_template SET seven_questions = $1::jsonb WHERE id = $2`,
          [JSON.stringify(BRUSH_TEETH_SEVEN_QUESTIONS), activityIds[name]]
        );
      }
      for (const [j, step] of (subSteps || []).entries()) {
        await client.query(
          'INSERT INTO activity_sub_step (activity_template_id, name, sort_order) VALUES ($1, $2, $3)',
          [activityIds[name], step, j]
        );
      }
    }

    // ── Weekly schedule: Mon–Sun ──
    for (const dow of [1, 2, 3, 4, 5, 6, 0]) {
      const isWeekend = dow === 0 || dow === 6;
      const sched = await client.query(
        'INSERT INTO weekly_schedule (child_id, family_id, day_of_week) VALUES ($1, $2, $3) RETURNING id',
        [childId, familyId, dow]
      );
      let sort = 0;
      for (const [name, , , section] of ACTIVITIES) {
        if (isWeekend && WEEKDAY_ONLY.has(name)) continue;
        await client.query(
          `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
           VALUES ($1, $2, $3, $4)`,
          [sched.rows[0].id, activityIds[name], sort++, section]
        );
      }
    }

    // ── Star history: yesterday fully done; today partial morning (Brush teeth = NU) ──
    for (const [offset, doneSections] of [[-1, ['morgon', 'dag', 'kvall']], [0, []]]) {
      const date = londonToday(offset);
      const log = await client.query(
        'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
        [childId, date]
      );
      let sort = 0;
      for (const [name, icon, stars, section] of ACTIVITIES) {
        if (WEEKDAY_ONLY.has(name) && ['0', '6'].includes(String(new Date(date + 'T12:00:00Z').getUTCDay()))) continue;
        const done =
          offset < 0
            ? doneSections.includes(section)
            : TODAY_DONE_ACTIVITIES.has(name);
        await client.query(
          `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, section,
             sort_order, completed, completed_at, completed_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [log.rows[0].id, activityIds[name], name, icon, stars, section, sort++,
            done, done ? new Date() : null, date]
        );
      }
    }

    // ── Rewards + approved redemptions (family museum top_rewards for store shot 07) ──
    const rewardIds = [];
    for (const [i, [name, icon, cost]] of REWARDS.entries()) {
      const rew = await client.query(
        `INSERT INTO reward (family_id, name, icon, star_cost, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [familyId, name, icon, cost, i]
      );
      rewardIds.push({ id: rew.rows[0].id, name, icon, cost });
    }

    const redemptionPlan = [
      { name: 'Movie night with popcorn', count: 3 },
      { name: 'Restaurant visit', count: 2 },
      { name: 'Choose Saturday dinner', count: 2 },
      { name: 'Trip to the playground', count: 1 },
    ];
    for (const plan of redemptionPlan) {
      const reward = rewardIds.find((r) => r.name === plan.name);
      if (!reward) continue;
      for (let i = 0; i < plan.count; i++) {
        await client.query(
          `INSERT INTO reward_redemption (reward_id, child_id, status, star_cost, redeemed_at)
           VALUES ($1, $2, 'approved', $3, NOW() - ($4 || ' days')::interval)`,
          [reward.id, childId, reward.cost, String(14 - i)]
        );
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
  }

  if (process.exitCode) {
    await db.pool.end().catch(() => {});
    process.exit(process.exitCode);
  }

  try {
    await familySubscriptions.grantComponent(familyId, 'teacch', null, {
      source: 'english_demo_seed',
    });

    console.log('English demo family seeded ✅');
    console.log(`  family_id : ${familyId}`);
    console.log(`  parent    : ${DEMO_EMAIL}`);
    console.log(`  password  : ${process.env.DEMO_FAMILY_PASSWORD ? '(from DEMO_FAMILY_PASSWORD env)' : password}`);
    console.log(`  child     : ${DEMO_CHILD.name} (username ${DEMO_CHILD.username})`);
    console.log(`  child PIN : ${process.env.DEMO_CHILD_PIN ? '(from DEMO_CHILD_PIN env)' : pin}`);
    console.log('  locale    : en-GB · flags english_app + english_child_experience · lifetime free');
  } catch (err) {
    console.error('Teacch grant failed:', err);
    process.exitCode = 1;
  } finally {
    await db.pool.end().catch(() => {});
    process.exit(process.exitCode || 0);
  }
}

main();
