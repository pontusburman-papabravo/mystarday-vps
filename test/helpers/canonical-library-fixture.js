'use strict';

const { readManifestFile, DEFAULT_MANIFEST_PATH } = require('../../src/lib/standard-library-manifest');
const { syncStandardLibrary } = require('../../src/lib/standard-library-sync');

async function seedCanonicalLibrary(client, manifest = readManifestFile(DEFAULT_MANIFEST_PATH)) {
  const result = await syncStandardLibrary(client, { manifest, dryRun: false });
  if (!result.ok) {
    throw new Error(`canonical seed failed: ${(result.conflictErrors || []).join('; ')}`);
  }
  return result;
}

async function createTestFamilyWithChild(db) {
  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, preferred_locale)
     VALUES ('Copy engine QA', 'Europe/Stockholm', 'sv-SE') RETURNING id`
  );
  const familyId = familyRes.rows[0].id;
  const childRes = await db.query(
    `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
     VALUES ($1, 'Astrid', '⭐', $2, '1234', 0) RETURNING id`,
    [familyId, `child-${Date.now()}`]
  );
  return { familyId, childId: childRes.rows[0].id };
}

async function findScheduleIdByCanonical(db, canonicalId) {
  const res = await db.query(
    'SELECT id FROM default_schedule WHERE canonical_id = $1 LIMIT 1',
    [canonicalId]
  );
  return res.rows[0]?.id ?? null;
}

async function findDefaultActivityByCanonical(db, canonicalId) {
  const res = await db.query(
    `SELECT id, name, canonical_id, duration_seconds, sub_steps, variants, name_i18n
     FROM default_activity_template WHERE canonical_id = $1 LIMIT 1`,
    [canonicalId]
  );
  return res.rows[0] ?? null;
}

module.exports = {
  seedCanonicalLibrary,
  createTestFamilyWithChild,
  findScheduleIdByCanonical,
  findDefaultActivityByCanonical,
};
