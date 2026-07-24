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

const PASSWORD = process.env.QA_PASSWORD || `QaPr713-${crypto.randomBytes(4).toString('hex')}!`;
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
      `INSERT INTO parent (email, password_hash, name, family_id, email_verified, account_type, onboarding_completed)
       VALUES ($1, $2, $3, $4, true, 'family', true)`,
      [acc.email, hash, acc.parentName, familyId]
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

async function main() {
  await ensureFeatures();
  const results = [];
  for (const acc of accounts) {
    results.push(await upsertAccount(acc));
  }
  console.log(JSON.stringify({ ok: true, accounts: results }, null, 2));
  console.log('Password set via QA_PASSWORD env (not printed).');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
