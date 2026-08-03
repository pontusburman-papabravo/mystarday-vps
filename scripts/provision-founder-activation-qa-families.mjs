#!/usr/bin/env node
/**
 * Idempotent sv-SE + en-GB founder activation QA families (@test.stjarndag.local).
 * Does not print passwords or PINs. Writes manifest path to stdout (no secrets).
 *
 *   QA_PASSWORD=<min12> QA_CHILD_PIN=<4digits> node scripts/provision-founder-activation-qa-families.mjs
 *   QA_MANIFEST_PATH=/tmp/founder-activation-qa-manifest.json (optional)
 */
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const pg = require('../src/lib/db');
const { hashPassword } = require('../src/lib/hash');
const { loadDefaultContent, resolveTimeGroup, resolveTimeOffset } = require('../src/lib/default-content');

const PASSWORD = process.env.QA_PASSWORD;
const QA_CHILD_PIN = process.env.QA_CHILD_PIN || String(1000 + (crypto.randomBytes(2).readUInt16BE(0) % 9000));

if (!PASSWORD || PASSWORD.length < 12) {
  console.error('Set QA_PASSWORD (min 12 chars)');
  process.exit(1);
}

const accounts = [
  {
    email: (process.env.QA_SV_EMAIL || 'founder-activation-qa-sv@test.stjarndag.local').toLowerCase(),
    locale: 'sv-SE',
    familyName: 'Founder Activation QA sv-SE',
    parentName: 'QA Activation sv-SE',
    englishApp: false,
  },
  {
    email: (process.env.QA_EN_EMAIL || 'founder-activation-qa-en@test.stjarndag.local').toLowerCase(),
    locale: 'en-GB',
    familyName: 'Founder Activation QA en-GB',
    parentName: 'QA Activation en-GB',
    englishApp: true,
  },
];

async function ensureFeatures() {
  await pg.query(
    `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
     VALUES ('english_app', 'English app', 'Parent/auth en-GB', 'dev', '{i18n}', 'high', 5, 8)
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
    await pg.query(`UPDATE family SET name = $1, preferred_locale = $2, is_lifetime_free = true WHERE id = $3`, [
      acc.familyName,
      acc.locale,
      familyId,
    ]);
  }

  if (acc.englishApp) {
    await pg.query(
      `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, 'english_app') ON CONFLICT DO NOTHING`,
      [familyId]
    );
  } else {
    await pg.query(`DELETE FROM family_features WHERE family_id = $1 AND feature_slug = 'english_app'`, [familyId]);
  }

  return { familyId, email: acc.email, locale: acc.locale };
}

async function ensureFamilyContent(familyId, locale) {
  const childCount = await pg.query('SELECT COUNT(*)::int AS n FROM child WHERE family_id = $1', [familyId]);
  if (childCount.rows[0].n > 0) {
    const existingChild = await pg.query(
      'SELECT id, name, username FROM child WHERE family_id = $1 ORDER BY created_at ASC LIMIT 1',
      [familyId]
    );
    return {
      childId: existingChild.rows[0]?.id,
      childUsername: existingChild.rows[0]?.username,
    };
  }

  const pinHash = await hashPassword(QA_CHILD_PIN);
  const childName = locale === 'en-GB' ? 'QA Activation Child' : 'QA Aktiveringsbarn';
  const username = locale === 'en-GB' ? 'qaacten' : 'qaactsv';
  const childRes = await pg.query(
    `INSERT INTO child (family_id, name, emoji, view_type, pin, username, sort_order)
     VALUES ($1, $2, '⭐', 'now_next_later', $3, $4, 0) RETURNING id`,
    [familyId, childName, pinHash, username]
  );
  const childId = childRes.rows[0].id;

  const parentRes = await pg.query('SELECT id FROM parent WHERE family_id = $1 ORDER BY created_at ASC LIMIT 1', [
    familyId,
  ]);
  if (parentRes.rows[0]) {
    await pg.query(
      `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary') ON CONFLICT DO NOTHING`,
      [parentRes.rows[0].id, childId]
    );
  }

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
  for (const act of defaultActivities.slice(0, 6)) {
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
  }

  const todayDow = new Date().getDay();
  const dayOfWeek = todayDow === 0 ? 7 : todayDow;
  const ws = await pg.query(
    `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, 1) RETURNING id`,
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

  return { childId, childUsername: username };
}

async function main() {
  await ensureFeatures();
  const manifest = {
    provisioned_at: new Date().toISOString(),
    families: [],
    credentials_note: 'QA_PASSWORD and QA_CHILD_PIN in operator env only — not stored in manifest',
  };

  for (const acc of accounts) {
    const base = await upsertAccount(acc);
    const content = await ensureFamilyContent(base.familyId, acc.locale);
    manifest.families.push({
      label: acc.familyName,
      family_id: base.familyId,
      locale: acc.locale,
      parent_email: base.email,
      child_id: content.childId,
      child_username: content.childUsername,
    });
  }

  const outPath = process.env.QA_MANIFEST_PATH || '/tmp/founder-activation-qa-manifest.json';
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ ok: true, manifest_path: outPath, families: manifest.families.map((f) => ({
    label: f.label,
    family_id: f.family_id,
    locale: f.locale,
    parent_email: f.parent_email,
    child_username: f.child_username,
  })) }));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
