#!/usr/bin/env node
/**
 * Prepare sv-SE + en-GB QA families for PR #713 staging/local testing.
 * Does not print passwords. Idempotent — safe to re-run.
 *
 * Usage:
 *   NODE_ENV=development node scripts/setup-pr713-qa-accounts.mjs
 *
 * Env overrides:
 *   QA_SV_EMAIL, QA_EN_EMAIL, QA_PASSWORD (min 12 chars)
 */
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const pg = require('../src/lib/db');
const { hashPassword } = require('../src/lib/hash');
const { loadDefaultContent, resolveTimeGroup, resolveTimeOffset } = require('../src/lib/default-content');

const PASSWORD = process.env.QA_PASSWORD || `QaPr713-${crypto.randomBytes(4).toString('hex')}!`;
const QA_CHILD_PIN = process.env.QA_CHILD_PIN || '7137';
const accounts = [
  {
    key: 'sv',
    email: (process.env.QA_SV_EMAIL || 'qa-pr713-sv@example.com').toLowerCase(),
    locale: 'sv-SE',
    englishApp: false,
    familyName: 'QA PR713 Svenska',
    parentName: 'QA Svenska',
  },
  {
    key: 'en',
    email: (process.env.QA_EN_EMAIL || 'qa-pr713-en@example.com').toLowerCase(),
    locale: 'en-GB',
    englishApp: true,
    familyName: 'QA PR713 English',
    parentName: 'QA English',
  },
];

async function ensureFeatures() {
  await pg.query(
    `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
     VALUES
       ('english_app', 'English app', 'Parent/auth en-GB', 'dev', '{i18n}', 'high', 5, 8),
       ('english_child_experience', 'English child pack', 'child_en QA gate', 'dev', '{i18n}', 'high', 5, 8)
     ON CONFLICT (slug) DO UPDATE SET status = 'dev', updated_at = NOW()`
  );
}

async function upsertAccount(acc) {
  const hash = await hashPassword(PASSWORD);
  let familyId;

  const existing = await pg.query('SELECT id, family_id FROM parent WHERE email = $1', [acc.email]);
  if (existing.rows.length === 0) {
    const fam = await pg.query(
      `INSERT INTO family (name, subscription_status, is_lifetime_free, preferred_locale)
       VALUES ($1, 'none', true, $2) RETURNING id`,
      [acc.familyName, acc.locale]
    );
    familyId = fam.rows[0].id;
    await pg.query(
      `INSERT INTO parent (family_id, email, password_hash, name, verified, newsletter_subscribed, family_role, onboarding_completed)
       VALUES ($1, $2, $3, $4, true, false, 'förälder', true)`,
      [familyId, acc.email, hash, acc.parentName]
    );
  } else {
    familyId = existing.rows[0].family_id;
    await pg.query(
      `UPDATE parent SET password_hash = $1, onboarding_completed = true, name = $2 WHERE email = $3`,
      [hash, acc.parentName, acc.email]
    );
  }

  await pg.query(
    `UPDATE family SET preferred_locale = $1, is_lifetime_free = true WHERE id = $2`,
    [acc.locale, familyId]
  );

  if (acc.englishApp) {
    await pg.query(
      `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, 'english_app') ON CONFLICT DO NOTHING`,
      [familyId]
    );
  } else {
    await pg.query(
      `DELETE FROM family_features WHERE family_id = $1 AND feature_slug = 'english_app'`,
      [familyId]
    );
  }

  return { familyId, email: acc.email, locale: acc.locale, englishApp: acc.englishApp };
}

async function ensureFamilyContent(familyId, locale) {
  const childCount = await pg.query('SELECT COUNT(*)::int AS n FROM child WHERE family_id = $1', [familyId]);
  if (childCount.rows[0].n > 0) return { seeded: false };

  const pinHash = await hashPassword(QA_CHILD_PIN);
  const childName = locale === 'en-GB' ? 'QA Child' : 'QA Barn';
  const childRes = await pg.query(
    `INSERT INTO child (family_id, name, emoji, view_type, pin, username, sort_order)
     VALUES ($1, $2, '⭐', 'now_next_later', $3, $4, 0) RETURNING id`,
    [familyId, childName, pinHash, locale === 'en-GB' ? 'qachild' : 'qabarn']
  );
  const childId = childRes.rows[0].id;

  const defaultContent = loadDefaultContent(locale);
  const { activities: defaultActivities, templateCategories } = defaultContent;
  const categoryMap = {};
  for (const cat of templateCategories) {
    const catResult = await pg.query(
      'INSERT INTO category (family_id, name, sort_order, is_default) VALUES ($1, $2, $3, true) RETURNING id',
      [familyId, cat.name, cat.sort_order]
    );
    categoryMap[cat.key] = catResult.rows[0].id;
  }

  const templateIds = [];
  for (const act of defaultActivities.slice(0, 8)) {
    const catId = categoryMap[act.schema_type];
    if (!catId) continue;
    const timeGroup = resolveTimeGroup(act.category);
    const combinedSort = resolveTimeOffset(act.category) + (act.sort_order ?? 0);
    const tplResult = await pg.query(
      `INSERT INTO activity_template (family_id, name, icon, category_id, star_value, is_favorite, time_group, schema_type, sort_order, source)
       VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8, 'admin') RETURNING id`,
      [familyId, act.name, act.icon, catId, act.star_value, timeGroup, act.schema_type, combinedSort]
    );
    templateIds.push(tplResult.rows[0].id);
    if (templateIds.length === 2) {
      await pg.query(
        `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
         VALUES ($1, $2, $3, 0), ($1, $4, $5, 1)`,
        [tplResult.rows[0].id, 'Step 1', '1️⃣', 'Step 2', '2️⃣']
      );
    }
  }

  const todayDow = new Date().getDay();
  const dayOfWeek = todayDow === 0 ? 7 : todayDow;
  const ws = await pg.query(
    `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order)
     VALUES ($1, $2, 1) RETURNING id`,
    [childId, dayOfWeek]
  );
  const sections = ['morgon', 'eftermiddag', 'kvall'];
  for (let i = 0; i < Math.min(templateIds.length, sections.length); i++) {
    await pg.query(
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
       VALUES ($1, $2, $3, $4)`,
      [ws.rows[0].id, templateIds[i], i, sections[i]]
    );
  }

  return { seeded: true, childId, childName, childUsername: locale === 'en-GB' ? 'qachild' : 'qabarn' };
}

async function main() {
  await ensureFeatures();
  const results = [];
  for (const acc of accounts) {
    const base = await upsertAccount(acc);
    const content = await ensureFamilyContent(base.familyId, acc.locale);
    results.push({ ...base, ...content });
  }

  const verifyRows = [];
  for (const acc of accounts) {
    const row = await pg.query(
      `SELECT p.email, f.preferred_locale,
              EXISTS (
                SELECT 1 FROM family_features ff
                WHERE ff.family_id = f.id AND ff.feature_slug = 'english_app'
              ) AS english_app,
              (SELECT COUNT(*)::int FROM child c WHERE c.family_id = f.id) AS child_count
       FROM parent p
       JOIN family f ON f.id = p.family_id
       WHERE p.email = $1`,
      [acc.email]
    );
    verifyRows.push(row.rows[0]);
  }

  console.log(JSON.stringify({ ok: true, accounts: results, verify: verifyRows }, null, 2));
  console.log('Password set via QA_PASSWORD env (not printed). Child PIN via QA_CHILD_PIN (default 7137, not printed).');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
