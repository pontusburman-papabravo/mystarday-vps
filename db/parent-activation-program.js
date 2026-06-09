/**
 * Parent activation program DB operations.
 * Owns: parent_activation_program table.
 * Does NOT own: day logic (src/lib/activation-program.js), enrollment (Fas 4).
 */
'use strict';

const db = require('../src/lib/db');

/**
 * Create a new activation program row.
 * @param {{ familyId: string, parentId: string, cohortArm: string, programType?: string, startedAt?: Date }} opts
 */
async function create({ familyId, parentId, cohortArm, programType = 'onboarding_7d', startedAt = null }) {
  const result = await db.query(
    `INSERT INTO parent_activation_program
       (family_id, parent_id, cohort_arm, program_type, started_at)
     VALUES ($1, $2, $3, $4, COALESCE($5, NOW()))
     RETURNING *`,
    [familyId, parentId, cohortArm, programType, startedAt]
  );
  return result.rows[0];
}

/**
 * Get the active program for a family, or null.
 */
async function getByFamily(familyId) {
  const result = await db.query(
    `SELECT * FROM parent_activation_program
     WHERE family_id = $1 AND status = 'active'
     LIMIT 1`,
    [familyId]
  );
  return result.rows[0] || null;
}

/**
 * Update program status (and related timestamps).
 */
async function updateStatus(programId, status) {
  const extras = [];
  const params = [status, programId];
  if (status === 'completed') extras.push('completed_at = NOW()');
  if (status === 'opted_out') extras.push('opted_out_at = NOW()');
  const setClause = extras.length
    ? `status = $1, updated_at = NOW(), ${extras.join(', ')}`
    : 'status = $1, updated_at = NOW()';

  const result = await db.query(
    `UPDATE parent_activation_program SET ${setClause} WHERE id = $2 RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

/**
 * Update last_seen_day (UI state for day-advance animation).
 */
async function updateLastSeenDay(programId, day) {
  const result = await db.query(
    `UPDATE parent_activation_program
     SET last_seen_day = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [programId, day]
  );
  return result.rows[0] || null;
}

module.exports = {
  create,
  getByFamily,
  updateStatus,
  updateLastSeenDay,
};
