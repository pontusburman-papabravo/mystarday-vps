/**
 * Package interest waitlist (§9.8).
 * Owns: package_interest table reads/writes.
 */

const db = require('../src/lib/db');

/**
 * @param {string} familyId
 * @param {string} parentId
 * @param {string} component
 * @param {string} source
 * @param {string|null} comment
 * @returns {Promise<{ row: object, alreadyRegistered: boolean }>}
 */
async function registerInterest(familyId, parentId, component, source, comment = null) {
  const { rows: existing } = await db.query(
    `SELECT id FROM package_interest
     WHERE family_id = $1 AND component = $2`,
    [familyId, component]
  );

  const { rows } = await db.query(
    `INSERT INTO package_interest (family_id, parent_id, component, source, comment)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (family_id, component) DO UPDATE
       SET comment = EXCLUDED.comment,
           source = EXCLUDED.source,
           parent_id = EXCLUDED.parent_id,
           created_at = NOW()
     RETURNING *`,
    [familyId, parentId, component, source, comment]
  );

  return {
    row: rows[0],
    alreadyRegistered: existing.length > 0,
  };
}

/**
 * @param {string} familyId
 * @returns {Promise<Record<string, boolean>>}
 */
async function getInterestMapForFamily(familyId) {
  const { rows } = await db.query(
    `SELECT component FROM package_interest WHERE family_id = $1`,
    [familyId]
  );
  const map = { reporting: false, pedagog: false, teacch: false };
  for (const row of rows) {
    if (row.component in map) map[row.component] = true;
  }
  return map;
}

/**
 * Admin stats helper (E13).
 */
async function getInterestCountsByComponent() {
  const { rows } = await db.query(
    `SELECT component, COUNT(DISTINCT family_id)::int AS families
     FROM package_interest
     GROUP BY component
     ORDER BY component`
  );
  return rows;
}

module.exports = {
  registerInterest,
  getInterestMapForFamily,
  getInterestCountsByComponent,
};
