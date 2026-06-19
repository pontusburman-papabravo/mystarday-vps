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
 * Get admin stats helper (E13).
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

/**
 * List interest registrations for admin (§9.10.5).
 * @param {{ component?: string, source?: string, from?: string, to?: string, limit?: number, offset?: number }} filters
 */
async function listInterest(filters = {}) {
  const {
    component,
    source,
    from,
    to,
    limit = 50,
    offset = 0,
  } = filters;

  const conditions = ['1=1'];
  const params = [];
  let idx = 1;

  if (component) {
    conditions.push(`pi.component = $${idx++}`);
    params.push(component);
  }
  if (source) {
    conditions.push(`pi.source = $${idx++}`);
    params.push(source);
  }
  if (from) {
    conditions.push(`pi.created_at >= $${idx++}::timestamptz`);
    params.push(from);
  }
  if (to) {
    conditions.push(`pi.created_at <= $${idx++}::timestamptz`);
    params.push(to);
  }

  const where = conditions.join(' AND ');
  const limitIdx = idx++;
  const offsetIdx = idx++;
  params.push(Math.min(Math.max(limit, 1), 200), Math.max(offset, 0));

  const { rows } = await db.query(
    `SELECT
       pi.id,
       pi.family_id,
       pi.parent_id,
       pi.component,
       pi.source,
       pi.comment,
       pi.created_at,
       f.name AS family_name,
       p.name AS parent_name
     FROM package_interest pi
     JOIN family f ON f.id = pi.family_id
     JOIN parent p ON p.id = pi.parent_id
     WHERE ${where}
     ORDER BY pi.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  const countParams = params.slice(0, params.length - 2);
  const { rows: countRows } = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM package_interest pi
     WHERE ${where}`,
    countParams
  );

  return { rows, total: countRows[0]?.total ?? 0 };
}

/**
 * CSV export rows (same filters as listInterest, no pagination cap for export).
 */
async function listInterestForExport(filters = {}) {
  const result = await listInterest({ ...filters, limit: 10000, offset: 0 });
  return result.rows;
}

module.exports = {
  registerInterest,
  getInterestMapForFamily,
  getInterestCountsByComponent,
  listInterest,
  listInterestForExport,
};
