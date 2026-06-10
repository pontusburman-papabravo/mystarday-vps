/**
 * db/parent-activation-program.js
 * CRUD for parent_activation_program (7-day activation experiment).
 */

const db = require('../src/lib/db');

const VALID_STATUSES = new Set(['active', 'completed', 'opted_out', 'expired']);
const VALID_COHORT_ARMS = new Set(['treatment', 'control']);
const VALID_PROGRAM_TYPES = new Set(['onboarding_7d', 'reactivation_3d']);

function assertValidStatus(status) {
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid activation program status: ${status}`);
  }
}

function assertValidCohortArm(cohortArm) {
  if (!VALID_COHORT_ARMS.has(cohortArm)) {
    throw new Error(`Invalid cohort_arm: ${cohortArm}`);
  }
}

function assertValidProgramType(programType) {
  if (!VALID_PROGRAM_TYPES.has(programType)) {
    throw new Error(`Invalid program_type: ${programType}`);
  }
}

/**
 * Create a new activation program row.
 * MVP invariant #15: callers should pass program_type = 'onboarding_7d' only.
 */
async function create({
  familyId,
  parentId,
  cohortArm,
  programType = 'onboarding_7d',
  status = 'active',
  startedAt = null,
  enrollSource = null,
}, client = db) {
  assertValidStatus(status);
  assertValidCohortArm(cohortArm);
  assertValidProgramType(programType);

  const params = [familyId, parentId, status, cohortArm, programType];
  let startedClause = 'NOW()';
  if (startedAt) {
    params.push(startedAt);
    startedClause = `$${params.length}`;
  }

  let enrollClause = 'NULL';
  if (enrollSource) {
    params.push(enrollSource);
    enrollClause = `$${params.length}`;
  }

  const result = await client.query(
    `INSERT INTO parent_activation_program
       (family_id, parent_id, status, cohort_arm, program_type, started_at, enroll_source)
     VALUES ($1, $2, $3, $4, $5, ${startedClause}, ${enrollClause})
     RETURNING *`,
    params
  );
  return result.rows[0];
}

async function getByFamily(familyId, client = db) {
  const result = await client.query(
    `SELECT * FROM parent_activation_program
     WHERE family_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [familyId]
  );
  return result.rows[0] || null;
}

async function getActiveByFamily(familyId, client = db) {
  const result = await client.query(
    `SELECT * FROM parent_activation_program
     WHERE family_id = $1 AND status = 'active'
     LIMIT 1`,
    [familyId]
  );
  return result.rows[0] || null;
}

/**
 * Banner eligibility — invariant #4: active + treatment only.
 */
async function getBannerProgramByFamily(familyId, client = db) {
  const result = await client.query(
    `SELECT * FROM parent_activation_program
     WHERE family_id = $1
       AND status = 'active'
       AND cohort_arm = 'treatment'
     LIMIT 1`,
    [familyId]
  );
  return result.rows[0] || null;
}

async function updateStatus(programId, status, extraOrClient = {}, clientMaybe = db) {
  let extra = {};
  let client = clientMaybe;
  if (extraOrClient && typeof extraOrClient.query === 'function') {
    client = extraOrClient;
  } else if (extraOrClient && typeof extraOrClient === 'object') {
    extra = extraOrClient;
  }

  assertValidStatus(status);

  const sets = ['status = $2', 'updated_at = NOW()'];
  const params = [programId, status];
  let idx = 3;

  if (status === 'completed') {
    sets.push('completed_at = COALESCE(completed_at, NOW())');
  }
  if (status === 'opted_out') {
    sets.push('opted_out_at = COALESCE(opted_out_at, NOW())');
  }
  if (extra.reflectionScore != null) {
    sets.push(`reflection_score = $${idx++}`);
    params.push(extra.reflectionScore);
  }
  if (extra.reflectionText !== undefined) {
    sets.push(`reflection_text = $${idx++}`);
    params.push(extra.reflectionText);
  }

  const result = await client.query(
    `UPDATE parent_activation_program
     SET ${sets.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

async function updateLastSeenDay(programId, lastSeenDay, client = db) {
  const result = await client.query(
    `UPDATE parent_activation_program
     SET last_seen_day = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [programId, lastSeenDay]
  );
  return result.rows[0] || null;
}

async function setFirstBannerSeenAt(programId, client = db) {
  const result = await client.query(
    `UPDATE parent_activation_program
     SET first_banner_seen_at = COALESCE(first_banner_seen_at, NOW()),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [programId]
  );
  return result.rows[0] || null;
}

async function updateDayStatus(programId, dayStatus, client = db) {
  const result = await client.query(
    `UPDATE parent_activation_program
     SET day_status = $2::jsonb, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [programId, JSON.stringify(dayStatus)]
  );
  return result.rows[0] || null;
}

async function getFamilyTimezone(familyId, client = db) {
  const result = await client.query(
    `SELECT COALESCE(timezone, 'Europe/Stockholm') AS timezone FROM family WHERE id = $1`,
    [familyId]
  );
  return result.rows[0]?.timezone || 'Europe/Stockholm';
}

module.exports = {
  VALID_STATUSES,
  VALID_COHORT_ARMS,
  VALID_PROGRAM_TYPES,
  create,
  getByFamily,
  getActiveByFamily,
  getBannerProgramByFamily,
  updateStatus,
  updateLastSeenDay,
  setFirstBannerSeenAt,
  updateDayStatus,
  getFamilyTimezone,
};
