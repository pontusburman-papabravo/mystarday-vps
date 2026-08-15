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
    [familyId, `child-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`]
  );
  return { familyId, childId: childRes.rows[0].id };
}

async function createSecondChildInFamily(db, familyId, name = 'Björn') {
  const childRes = await db.query(
    `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
     VALUES ($1, $2, '🌟', $3, '5678', 1) RETURNING id`,
    [familyId, name, `child-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`]
  );
  return childRes.rows[0].id;
}

async function getAfterSchoolScheduleSnapshot(db, childId, dayOfWeek) {
  const res = await db.query(
    `SELECT at.id AS template_id, at.name, at.source_canonical_id, at.source_default_activity_id
     FROM weekly_schedule_item wsi
     JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
     JOIN activity_template at ON at.id = wsi.activity_template_id
     WHERE ws.child_id = $1 AND ws.day_of_week = $2 AND at.source_canonical_id = 'after_school'`,
    [childId, dayOfWeek]
  );
  return res.rows[0] ?? null;
}

async function getSubstepNames(db, templateId) {
  const res = await db.query(
    `SELECT name FROM activity_sub_step
     WHERE activity_template_id = $1
     ORDER BY sort_order ASC`,
    [templateId]
  );
  return res.rows.map((r) => r.name);
}

async function countFamilyWrites(db, familyId) {
  const [templates, substeps, schedules, items] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS count FROM activity_template WHERE family_id = $1`, [familyId]),
    db.query(
      `SELECT COUNT(*)::int AS count FROM activity_sub_step ass
       JOIN activity_template at ON at.id = ass.activity_template_id
       WHERE at.family_id = $1`,
      [familyId]
    ),
    db.query(
      `SELECT COUNT(*)::int AS count FROM weekly_schedule ws
       JOIN child c ON c.id = ws.child_id WHERE c.family_id = $1`,
      [familyId]
    ),
    db.query(
      `SELECT COUNT(*)::int AS count FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       JOIN child c ON c.id = ws.child_id WHERE c.family_id = $1`,
      [familyId]
    ),
  ]);
  return {
    activityTemplates: templates.rows[0].count,
    activitySubSteps: substeps.rows[0].count,
    weeklySchedules: schedules.rows[0].count,
    weeklyScheduleItems: items.rows[0].count,
  };
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
  createSecondChildInFamily,
  getAfterSchoolScheduleSnapshot,
  getSubstepNames,
  countFamilyWrites,
  findScheduleIdByCanonical,
  findDefaultActivityByCanonical,
};
