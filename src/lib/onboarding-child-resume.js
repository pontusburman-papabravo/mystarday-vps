'use strict';

/**
 * Resume helpers for onboarding Step 1 when a child was created but schedule
 * save failed (child_without_schema). Prevents permanent 409 loops after retry
 * or app reinstall.
 */

/**
 * @param {object} db
 * @param {string} familyId
 * @param {string} name
 * @returns {Promise<{ id: string, name: string, emoji: string|null, username: string|null, birthday: string|null, avatar_storage_key: string|null, avatar_updated_at: Date|null, created_at: Date }|null>}
 */
async function findChildByNameInFamily(db, familyId, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed || !familyId) return null;
  const result = await db.query(
    `SELECT id, name, emoji, username, birthday, avatar_storage_key, avatar_updated_at, created_at
     FROM child
     WHERE family_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))
     ORDER BY created_at ASC
     LIMIT 1`,
    [familyId, trimmed]
  );
  return result.rows[0] || null;
}

/**
 * @param {object} db
 * @param {string} childId
 * @returns {Promise<boolean>}
 */
async function childHasScheduleItems(db, childId) {
  if (!childId) return false;
  const result = await db.query(
    `SELECT 1
     FROM weekly_schedule_item wsi
     JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
     WHERE ws.child_id = $1
     LIMIT 1`,
    [childId]
  );
  return result.rows.length > 0;
}

/**
 * True when the child exists in the family but has no weekly schedule items yet.
 * @param {object} db
 * @param {string} familyId
 * @param {string} name
 */
async function findResumableChildWithoutSchema(db, familyId, name) {
  const child = await findChildByNameInFamily(db, familyId, name);
  if (!child) return null;
  const hasSchedule = await childHasScheduleItems(db, child.id);
  if (hasSchedule) return null;
  return child;
}

module.exports = {
  findChildByNameInFamily,
  childHasScheduleItems,
  findResumableChildWithoutSchema,
};
