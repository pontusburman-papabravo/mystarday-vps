#!/usr/bin/env node
'use strict';
/**
 * Founder QA family feature rows only — run on VPS with DATABASE_URL + FOUNDER_QA_EMAIL.
 * Usage: node scripts/ops/founder-smoke-db-helper.mjs snapshot|restore|set --family-id <uuid> [--slug english_app] [--on|--off]
 */
const db = require('../../src/lib/db');
const { assertFamilyEligibleForFounderOverride } = require('../../src/lib/founder-qa-family-guard');

const SNAPSHOT_KEY = ['english_app', 'english_child_experience'];

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
    features: feats.rows.map((r) => r.feature_slug),
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

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const familyId = args[args.indexOf('--family-id') + 1];
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
    console.log(JSON.stringify({ ok: true, restored: snap }));
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
