#!/usr/bin/env node
'use strict';
/**
 * Founder QA family feature rows only — run on VPS with DATABASE_URL + FOUNDER_QA_EMAIL.
 * Usage: node scripts/ops/founder-smoke-db-helper.mjs snapshot|restore|set --family-id <uuid> [--slug english_app] [--on|--off]
 */
const db = require('../../src/lib/db');
const {
  assertFamilyEligibleForFounderOverride,
  isFounderQaParentEmail,
  normalizeEmail,
} = require('../../src/lib/founder-qa-family-guard');

const SNAPSHOT_KEY = ['english_app', 'english_child_experience'];
const SMOKE_EMAIL_RE = /^smoke-\d+@example\.com$/i;

async function snapshot(familyId) {
  const locale = await db.query(
    `SELECT preferred_locale FROM family WHERE id = $1`,
    [familyId]
  );
  const feats = await db.query(
    `SELECT feature_slug FROM family_features WHERE family_id = $1 AND feature_slug = ANY($2::text[])`,
    [familyId, SNAPSHOT_KEY]
  );
  return {
    preferred_locale: locale.rows[0]?.preferred_locale || 'sv-SE',
    features: feats.rows.map((r) => r.feature_slug).sort(),
  };
}

async function setFeature(familyId, slug, on) {
  if (on) {
    await db.query(
      `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [familyId, slug]
    );
  } else {
    await db.query(
      `DELETE FROM family_features WHERE family_id = $1 AND feature_slug = $2`,
      [familyId, slug]
    );
  }
}

async function restore(familyId, snap) {
  await db.query(`UPDATE family SET preferred_locale = $1 WHERE id = $2`, [
    snap.preferred_locale,
    familyId,
  ]);
  for (const slug of SNAPSHOT_KEY) {
    await setFeature(familyId, slug, snap.features.includes(slug));
  }
}

async function assertSmokeFamilyDeletable(familyId, expectedEmail, notBeforeMs) {
  const email = normalizeEmail(expectedEmail);
  if (!SMOKE_EMAIL_RE.test(email)) {
    throw new Error('refusing delete: email is not smoke-*@example.com');
  }
  if (isFounderQaParentEmail(email)) {
    throw new Error('refusing delete: founder QA email');
  }
  const parents = await db.query('SELECT id, email FROM parent WHERE family_id = $1', [familyId]);
  if (parents.rows.length !== 1) {
    throw new Error('refusing delete: expected exactly one parent');
  }
  if (normalizeEmail(parents.rows[0].email) !== email) {
    throw new Error('refusing delete: parent email mismatch');
  }
  const fam = await db.query('SELECT created_at FROM family WHERE id = $1', [familyId]);
  if (!fam.rows[0]) throw new Error('refusing delete: family not found');
  if (notBeforeMs != null && Number.isFinite(Number(notBeforeMs))) {
    const createdMs = new Date(fam.rows[0].created_at).getTime();
    if (createdMs < Number(notBeforeMs)) {
      throw new Error('refusing delete: family created before smoke run window');
    }
  }
}

async function findSmokeFamilyByEmail(email, notBeforeMs) {
  const normalized = normalizeEmail(email);
  if (!SMOKE_EMAIL_RE.test(normalized)) {
    return { family_id: null };
  }
  const { rows } = await db.query(
    `SELECT f.id, f.created_at, p.email
     FROM family f
     JOIN parent p ON p.family_id = f.id
     WHERE lower(p.email) = $1`,
    [normalized]
  );
  if (!rows.length) return { family_id: null };
  if (rows.length > 1) {
    throw new Error('ambiguous smoke email: multiple families');
  }
  if (isFounderQaParentEmail(rows[0].email)) {
    throw new Error('refusing lookup: founder QA email');
  }
  if (notBeforeMs != null && Number.isFinite(Number(notBeforeMs))) {
    const createdMs = new Date(rows[0].created_at).getTime();
    if (createdMs < Number(notBeforeMs)) {
      return { family_id: null, reason: 'too_old' };
    }
  }
  return { family_id: rows[0].id };
}

async function familyExists(familyId) {
  const { rows } = await db.query('SELECT 1 FROM family WHERE id = $1', [familyId]);
  return { exists: rows.length > 0 };
}

/** Minimal disposable smoke-family delete (smoke-*@example.com only). */
async function deleteSmokeFamilyRow(client, familyId) {
  const children = await client.query('SELECT id FROM child WHERE family_id = $1', [familyId]);
  for (const child of children.rows) {
    await client.query(
      `DELETE FROM daily_log_item WHERE daily_log_id IN (
         SELECT id FROM daily_log WHERE child_id = $1
       )`,
      [child.id]
    );
    await client.query('DELETE FROM daily_log WHERE child_id = $1', [child.id]);
    await client.query(
      `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
         SELECT id FROM weekly_schedule WHERE child_id = $1
       )`,
      [child.id]
    );
    await client.query('DELETE FROM weekly_schedule WHERE child_id = $1', [child.id]);
    await client.query('DELETE FROM streak WHERE child_id = $1', [child.id]);
    await client.query('DELETE FROM reward_redemption WHERE child_id = $1', [child.id]);
  }
  await client.query(
    'DELETE FROM parent_child WHERE child_id IN (SELECT id FROM child WHERE family_id = $1) OR parent_id IN (SELECT id FROM parent WHERE family_id = $1)',
    [familyId]
  );
  await client.query('DELETE FROM child WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM reward WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM activity_template WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM category WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM family_invite WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM family_features WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM family_subscriptions WHERE family_id = $1', [familyId]);
  await client.query(
    'DELETE FROM refresh_token WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)',
    [familyId]
  );
  await client.query('DELETE FROM parent WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM family WHERE id = $1', [familyId]);
}

async function deleteSmokeFamilyCmd(familyId, email, notBeforeMs) {
  await assertSmokeFamilyDeletable(familyId, email, notBeforeMs);
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await deleteSmokeFamilyRow(client, familyId);
    await client.query('COMMIT');
    return { ok: true, family_id: familyId };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'find-smoke-family') {
    const email = args[args.indexOf('--email') + 1];
    const notBefore = args[args.indexOf('--not-before') + 1];
    if (!email) {
      console.error('missing --email');
      process.exit(2);
    }
    console.log(JSON.stringify(await findSmokeFamilyByEmail(email, notBefore)));
    return;
  }

  const familyId = args[args.indexOf('--family-id') + 1];

  if (cmd === 'family-exists') {
    if (!familyId) {
      console.error('missing --family-id');
      process.exit(2);
    }
    console.log(JSON.stringify(await familyExists(familyId)));
    return;
  }

  if (cmd === 'delete-smoke-family') {
    const email = args[args.indexOf('--email') + 1];
    const notBefore = args[args.indexOf('--not-before') + 1];
    if (!familyId || !email) {
      console.error('delete-smoke-family requires --family-id and --email');
      process.exit(2);
    }
    console.log(JSON.stringify(await deleteSmokeFamilyCmd(familyId, email, notBefore)));
    return;
  }

  if (!familyId) {
    console.error('missing --family-id');
    process.exit(2);
  }
  await assertFamilyEligibleForFounderOverride(db, familyId);

  if (cmd === 'snapshot') {
    console.log(JSON.stringify(await snapshot(familyId)));
    return;
  }
  if (cmd === 'restore') {
    let snap;
    const b64Idx = args.indexOf('--json-base64');
    if (b64Idx >= 0) {
      snap = JSON.parse(Buffer.from(args[b64Idx + 1], 'base64').toString('utf8'));
    } else {
      snap = JSON.parse(args[args.indexOf('--json') + 1]);
    }
    await restore(familyId, snap);
    const after = await snapshot(familyId);
    const matches =
      after.preferred_locale === snap.preferred_locale &&
      JSON.stringify(after.features) === JSON.stringify([...(snap.features || [])].sort());
    console.log(JSON.stringify({ ok: true, restored: snap, restore_matches_snapshot: matches, after }));
    return;
  }
  if (cmd === 'set') {
    const slug = args[args.indexOf('--slug') + 1];
    const on = args.includes('--on');
    await setFeature(familyId, slug, on);
    console.log(JSON.stringify({ ok: true, slug, on }));
    return;
  }
  if (cmd === 'set-locale') {
    const loc = args[args.indexOf('--locale') + 1];
    await db.query(`UPDATE family SET preferred_locale = $1 WHERE id = $2`, [loc, familyId]);
    console.log(JSON.stringify({ ok: true, locale: loc }));
    return;
  }
  console.error('unknown cmd');
  process.exit(2);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => db.pool.end());
