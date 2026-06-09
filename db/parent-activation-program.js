/**
 * Parent activation program — DB queries.
 */

const db = require('../src/lib/db');

async function create({
  familyId,
  parentId,
  cohortArm,
  programType = 'onboarding_7d',
  startedAt = null,
}) {
  const result = await db.query(
    `INSERT INTO parent_activation_program
       (family_id, parent_id, cohort_arm, program_type, started_at)
     VALUES ($1, $2, $3, $4, COALESCE($5, NOW()))
     RETURNING *`,
    [familyId, parentId, cohortArm, programType, startedAt]
  );
  return result.rows[0];
}

async function getByFamily(familyId) {
  const result = await db.query(
    `SELECT * FROM parent_activation_program
     WHERE family_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [familyId]
  );
  return result.rows[0] || null;
}

async function getActiveByFamily(familyId) {
  const result = await db.query(
    `SELECT * FROM parent_activation_program
     WHERE family_id = $1 AND status = 'active'
     ORDER BY created_at DESC
     LIMIT 1`,
    [familyId]
  );
  return result.rows[0] || null;
}

async function updateStatus(id, status, extra = {}) {
  const sets = ['status = $2', 'updated_at = NOW()'];
  const values = [id, status];
  let idx = 3;

  if (status === 'completed' && extra.completedAt !== false) {
    sets.push(`completed_at = COALESCE(completed_at, NOW())`);
  }
  if (status === 'opted_out') {
    sets.push(`opted_out_at = COALESCE(opted_out_at, NOW())`);
  }
  if (extra.reflectionScore != null) {
    sets.push(`reflection_score = $${idx++}`);
    values.push(extra.reflectionScore);
  }
  if (extra.reflectionText !== undefined) {
    sets.push(`reflection_text = $${idx++}`);
    values.push(extra.reflectionText);
  }

  const result = await db.query(
    `UPDATE parent_activation_program SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function updateLastSeenDay(id, lastSeenDay) {
  const result = await db.query(
    `UPDATE parent_activation_program
     SET last_seen_day = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, lastSeenDay]
  );
  return result.rows[0] || null;
}

async function setFirstBannerSeenAt(id) {
  const result = await db.query(
    `UPDATE parent_activation_program
     SET first_banner_seen_at = COALESCE(first_banner_seen_at, NOW()),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

async function updateDayStatus(id, dayStatus) {
  const result = await db.query(
    `UPDATE parent_activation_program
     SET day_status = $2::jsonb, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, JSON.stringify(dayStatus)]
  );
  return result.rows[0] || null;
}

async function getFamilyTimezone(familyId) {
  const result = await db.query(
    `SELECT COALESCE(timezone, 'Europe/Stockholm') AS timezone FROM family WHERE id = $1`,
    [familyId]
  );
  return result.rows[0]?.timezone || 'Europe/Stockholm';
}

module.exports = {
  create,
  getByFamily,
  getActiveByFamily,
  updateStatus,
  updateLastSeenDay,
  setFirstBannerSeenAt,
  updateDayStatus,
  getFamilyTimezone,
};
