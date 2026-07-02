'use strict';

const db = require('../src/lib/db');

const PATTERN_ALTERNATE_WEEKS = 'alternate_weeks';
const PATTERN_ALTERNATE_WEEKENDS = 'alternate_weekends';
const { PATTERN_CUSTOM } = require('../src/lib/custody-custom-config');

/**
 * Build configuration JSON for alternate_weeks from legacy home IDs.
 * @param {string} homeAId
 * @param {string} homeBId
 */
function buildAlternateWeeksConfiguration(homeAId, homeBId) {
  return { home_a: homeAId, home_b: homeBId };
}

/**
 * Normalize schedule row configuration from explicit config or legacy columns.
 * @param {object} pattern
 */
function resolveScheduleFields(pattern) {
  const patternType = pattern.pattern_type || PATTERN_ALTERNATE_WEEKS;
  let configuration = pattern.configuration;

  if (!configuration || (typeof configuration === 'object' && Object.keys(configuration).length === 0)) {
    if (patternType === PATTERN_ALTERNATE_WEEKS && pattern.week_a_home_id && pattern.week_b_home_id) {
      configuration = buildAlternateWeeksConfiguration(
        pattern.week_a_home_id,
        pattern.week_b_home_id
      );
    } else {
      configuration = {};
    }
  }

  return { patternType, configuration };
}

/**
 * @param {string} familyId
 */
async function listHomes(familyId, client = db) {
  const result = await client.query(
    `SELECT id, family_id, label, color, icon, sort_order, created_at
     FROM custody_home
     WHERE family_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [familyId]
  );
  return result.rows;
}

/**
 * @param {string} familyId
 */
async function listParentHomes(familyId, client = db) {
  const result = await client.query(
    `SELECT cph.parent_id, cph.custody_home_id
     FROM custody_parent_home cph
     JOIN parent p ON p.id = cph.parent_id
     WHERE p.family_id = $1`,
    [familyId]
  );
  return result.rows;
}

const SCHEDULE_SELECT = `
  SELECT child_id, anchor_date::text AS anchor_date, interval_weeks,
         week_a_home_id, week_b_home_id,
         pattern_type, configuration,
         COALESCE(pack_luggage_reminder, true) AS pack_luggage_reminder,
         created_at, updated_at
  FROM custody_pattern
`;

/**
 * @param {string} childId
 */
async function getPattern(childId, client = db) {
  const result = await client.query(
    `${SCHEDULE_SELECT} WHERE child_id = $1`,
    [childId]
  );
  return result.rows[0] || null;
}

/** @deprecated Use getSchedule — alias for Phase 2 transition */
const getSchedule = getPattern;

/**
 * @param {string} familyId
 */
async function listPatternsForFamily(familyId, client = db) {
  const result = await client.query(
    `SELECT cp.child_id, cp.anchor_date::text AS anchor_date, cp.interval_weeks,
            cp.week_a_home_id, cp.week_b_home_id,
            cp.pattern_type, cp.configuration
     FROM custody_pattern cp
     JOIN child c ON c.id = cp.child_id
     WHERE c.family_id = $1`,
    [familyId]
  );
  return result.rows;
}

/** Alias — schedules per family */
const listSchedulesForFamily = listPatternsForFamily;

/**
 * @param {string} homeId
 * @param {string} familyId
 */
async function getHomeInFamily(homeId, familyId, client = db) {
  const result = await client.query(
    `SELECT id, family_id, label, color, icon, sort_order
     FROM custody_home
     WHERE id = $1 AND family_id = $2`,
    [homeId, familyId]
  );
  return result.rows[0] || null;
}

/**
 * @param {object} row
 * @param {import('pg').PoolClient} [client]
 */
async function upsertHome(row, client = db) {
  const icon = row.icon ?? null;
  if (row.id) {
    const result = await client.query(
      `UPDATE custody_home
       SET label = $3, color = $4, sort_order = $5, icon = $6
       WHERE id = $1 AND family_id = $2
       RETURNING id, family_id, label, color, icon, sort_order`,
      [row.id, row.family_id, row.label, row.color, row.sort_order ?? 0, icon]
    );
    return result.rows[0];
  }
  const result = await client.query(
    `INSERT INTO custody_home (family_id, label, color, sort_order, icon)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, family_id, label, color, icon, sort_order`,
    [row.family_id, row.label, row.color, row.sort_order ?? 0, icon]
  );
  return result.rows[0];
}

/**
 * @param {string} parentId
 * @param {string} custodyHomeId
 */
async function setParentHome(parentId, custodyHomeId, client = db) {
  await client.query('DELETE FROM custody_parent_home WHERE parent_id = $1', [parentId]);
  if (custodyHomeId) {
    await client.query(
      `INSERT INTO custody_parent_home (parent_id, custody_home_id)
       VALUES ($1, $2)
       ON CONFLICT (parent_id, custody_home_id) DO NOTHING`,
      [parentId, custodyHomeId]
    );
  }
}

/**
 * @param {object} pattern
 */
async function upsertPattern(pattern, client = db) {
  const { patternType, configuration } = resolveScheduleFields(pattern);
  const result = await client.query(
    `INSERT INTO custody_pattern (
       child_id, anchor_date, interval_weeks, week_a_home_id, week_b_home_id,
       pattern_type, configuration
     ) VALUES ($1, $2::date, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (child_id) DO UPDATE SET
       anchor_date = EXCLUDED.anchor_date,
       interval_weeks = EXCLUDED.interval_weeks,
       week_a_home_id = EXCLUDED.week_a_home_id,
       week_b_home_id = EXCLUDED.week_b_home_id,
       pattern_type = EXCLUDED.pattern_type,
       configuration = EXCLUDED.configuration,
       updated_at = now()
     RETURNING child_id, anchor_date::text AS anchor_date, interval_weeks,
               week_a_home_id, week_b_home_id, pattern_type, configuration,
               COALESCE(pack_luggage_reminder, true) AS pack_luggage_reminder`,
    [
      pattern.child_id,
      pattern.anchor_date,
      pattern.interval_weeks ?? 2,
      pattern.week_a_home_id,
      pattern.week_b_home_id,
      patternType,
      JSON.stringify(configuration),
    ]
  );
  return result.rows[0];
}

/** Alias — domain naming */
const upsertSchedule = upsertPattern;

/**
 * @param {string} childId
 */
async function deletePattern(childId, client = db) {
  await client.query('DELETE FROM custody_pattern WHERE child_id = $1', [childId]);
}

const deleteSchedule = deletePattern;

/**
 * @param {string} familyId
 */
async function getFamilyConfig(familyId, client = db) {
  const [homes, parentHomes, patterns] = await Promise.all([
    listHomes(familyId, client),
    listParentHomes(familyId, client),
    listPatternsForFamily(familyId, client),
  ]);
  return { homes, parentHomes, patterns, schedules: patterns };
}

/**
 * @param {string} parentId
 * @param {string} familyId
 */
async function getParentHomeId(parentId, familyId, client = db) {
  const result = await client.query(
    `SELECT cph.custody_home_id
     FROM custody_parent_home cph
     JOIN parent p ON p.id = cph.parent_id
     WHERE cph.parent_id = $1 AND p.family_id = $2
     LIMIT 1`,
    [parentId, familyId]
  );
  return result.rows[0]?.custody_home_id || null;
}

const OVERRIDE_SELECT = `
  SELECT co.id, co.child_id, co.start_date::text AS start_date,
         co.end_date::text AS end_date, co.home_id, co.reason, co.priority,
         co.created_at, co.updated_at
  FROM custody_override co
`;

/**
 * @param {string} childId
 */
async function listOverridesForChild(childId, client = db) {
  const result = await client.query(
    `${OVERRIDE_SELECT}
     WHERE co.child_id = $1
     ORDER BY co.start_date ASC, co.priority DESC, co.created_at ASC`,
    [childId]
  );
  return result.rows;
}

/**
 * @param {string} familyId
 */
async function listOverridesForFamily(familyId, client = db) {
  const result = await client.query(
    `${OVERRIDE_SELECT}
     JOIN child c ON c.id = co.child_id
     WHERE c.family_id = $1
     ORDER BY co.child_id, co.start_date ASC, co.priority DESC, co.created_at ASC`,
    [familyId]
  );
  return result.rows;
}

/**
 * @param {string} overrideId
 * @param {string} familyId
 */
async function getOverrideInFamily(overrideId, familyId, client = db) {
  const result = await client.query(
    `${OVERRIDE_SELECT}
     JOIN child c ON c.id = co.child_id
     WHERE co.id = $1 AND c.family_id = $2`,
    [overrideId, familyId]
  );
  return result.rows[0] || null;
}

/**
 * @param {object} row
 */
async function createOverride(row, client = db) {
  const result = await client.query(
    `INSERT INTO custody_override (child_id, start_date, end_date, home_id, reason, priority)
     VALUES ($1, $2::date, $3::date, $4, $5, $6)
     RETURNING id, child_id, start_date::text AS start_date, end_date::text AS end_date,
               home_id, reason, priority, created_at, updated_at`,
    [
      row.child_id,
      row.start_date,
      row.end_date,
      row.home_id,
      row.reason ?? null,
      row.priority ?? 0,
    ]
  );
  return result.rows[0];
}

/**
 * @param {string} overrideId
 * @param {object} row
 */
async function updateOverride(overrideId, row, client = db) {
  const result = await client.query(
    `UPDATE custody_override
     SET start_date = $2::date,
         end_date = $3::date,
         home_id = $4,
         reason = $5,
         priority = $6,
         updated_at = now()
     WHERE id = $1
     RETURNING id, child_id, start_date::text AS start_date, end_date::text AS end_date,
               home_id, reason, priority, created_at, updated_at`,
    [
      overrideId,
      row.start_date,
      row.end_date,
      row.home_id,
      row.reason ?? null,
      row.priority ?? 0,
    ]
  );
  return result.rows[0] || null;
}

/**
 * @param {string} overrideId
 */
async function deleteOverride(overrideId, client = db) {
  const result = await client.query(
    'DELETE FROM custody_override WHERE id = $1 RETURNING id',
    [overrideId]
  );
  return result.rows[0] || null;
}

module.exports = {
  PATTERN_ALTERNATE_WEEKS,
  PATTERN_ALTERNATE_WEEKENDS,
  PATTERN_CUSTOM,
  buildAlternateWeeksConfiguration,
  resolveScheduleFields,
  listHomes,
  listParentHomes,
  getPattern,
  getSchedule,
  listPatternsForFamily,
  listSchedulesForFamily,
  getHomeInFamily,
  upsertHome,
  setParentHome,
  upsertPattern,
  upsertSchedule,
  deletePattern,
  deleteSchedule,
  getFamilyConfig,
  getParentHomeId,
  listOverridesForChild,
  listOverridesForFamily,
  getOverrideInFamily,
  createOverride,
  updateOverride,
  deleteOverride,
};
