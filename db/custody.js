'use strict';

const db = require('../src/lib/db');

/**
 * @param {string} familyId
 */
async function listHomes(familyId, client = db) {
  const result = await client.query(
    `SELECT id, family_id, label, color, sort_order, created_at
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

/**
 * @param {string} childId
 */
async function getPattern(childId, client = db) {
  const result = await client.query(
    `SELECT child_id, anchor_date::text AS anchor_date, interval_weeks,
            week_a_home_id, week_b_home_id, created_at, updated_at
     FROM custody_pattern
     WHERE child_id = $1`,
    [childId]
  );
  return result.rows[0] || null;
}

/**
 * @param {string} familyId
 */
async function listPatternsForFamily(familyId, client = db) {
  const result = await client.query(
    `SELECT cp.child_id, cp.anchor_date::text AS anchor_date, cp.interval_weeks,
            cp.week_a_home_id, cp.week_b_home_id
     FROM custody_pattern cp
     JOIN child c ON c.id = cp.child_id
     WHERE c.family_id = $1`,
    [familyId]
  );
  return result.rows;
}

/**
 * @param {string} homeId
 * @param {string} familyId
 */
async function getHomeInFamily(homeId, familyId, client = db) {
  const result = await client.query(
    `SELECT id, family_id, label, color, sort_order
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
  if (row.id) {
    const result = await client.query(
      `UPDATE custody_home
       SET label = $3, color = $4, sort_order = $5
       WHERE id = $1 AND family_id = $2
       RETURNING id, family_id, label, color, sort_order`,
      [row.id, row.family_id, row.label, row.color, row.sort_order ?? 0]
    );
    return result.rows[0];
  }
  const result = await client.query(
    `INSERT INTO custody_home (family_id, label, color, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING id, family_id, label, color, sort_order`,
    [row.family_id, row.label, row.color, row.sort_order ?? 0]
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
  const result = await client.query(
    `INSERT INTO custody_pattern (
       child_id, anchor_date, interval_weeks, week_a_home_id, week_b_home_id
     ) VALUES ($1, $2::date, $3, $4, $5)
     ON CONFLICT (child_id) DO UPDATE SET
       anchor_date = EXCLUDED.anchor_date,
       interval_weeks = EXCLUDED.interval_weeks,
       week_a_home_id = EXCLUDED.week_a_home_id,
       week_b_home_id = EXCLUDED.week_b_home_id,
       updated_at = now()
     RETURNING child_id, anchor_date::text AS anchor_date, interval_weeks,
               week_a_home_id, week_b_home_id`,
    [
      pattern.child_id,
      pattern.anchor_date,
      pattern.interval_weeks ?? 2,
      pattern.week_a_home_id,
      pattern.week_b_home_id,
    ]
  );
  return result.rows[0];
}

/**
 * @param {string} childId
 */
async function deletePattern(childId, client = db) {
  await client.query('DELETE FROM custody_pattern WHERE child_id = $1', [childId]);
}

/**
 * @param {string} familyId
 */
async function getFamilyConfig(familyId, client = db) {
  const [homes, parentHomes, patterns] = await Promise.all([
    listHomes(familyId, client),
    listParentHomes(familyId, client),
    listPatternsForFamily(familyId, client),
  ]);
  return { homes, parentHomes, patterns };
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

module.exports = {
  listHomes,
  listParentHomes,
  getPattern,
  listPatternsForFamily,
  getHomeInFamily,
  upsertHome,
  setParentHome,
  upsertPattern,
  deletePattern,
  getFamilyConfig,
  getParentHomeId,
};
