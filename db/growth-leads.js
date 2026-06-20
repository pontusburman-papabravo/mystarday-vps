/**
 * Unified growth lead pipeline — Fas 3C.
 */
const db = require('../src/lib/db');

const LEAD_STATUSES = ['ny', 'kontaktad', 'kvalificerad', 'konverterad', 'avslutad'];

async function listPipeline({ status, leadType, limit = 100 } = {}) {
  const params = [];
  let idx = 1;
  const statusFilter = status && LEAD_STATUSES.includes(status)
    ? `AND lead_status = $${idx++}`
    : '';
  if (status && LEAD_STATUSES.includes(status)) params.push(status);

  const typeFilter = leadType === 'package'
    ? "AND source_type = 'package'"
    : leadType === 'pedagog'
      ? "AND source_type = 'pedagog'"
      : leadType === 'waitlist'
        ? "AND source_type = 'waitlist'"
        : '';

  params.push(Math.min(Math.max(limit, 1), 200));

  const { rows } = await db.query(
    `
    SELECT * FROM (
      SELECT
        'package'::text AS source_type,
        pi.id::text AS id,
        pi.lead_status,
        pi.owner,
        pi.last_contacted_at,
        pi.lead_notes,
        pi.converted_at,
        pi.created_at,
        pi.component AS meta,
        pi.source AS submeta,
        f.name AS title,
        f.id AS family_id
      FROM package_interest pi
      JOIN family f ON f.id = pi.family_id

      UNION ALL

      SELECT
        'pedagog',
        pr.id::text,
        pr.lead_status,
        pr.owner,
        pr.last_contacted_at,
        pr.lead_notes,
        pr.converted_at,
        pr.created_at,
        pr.role,
        pr.email,
        COALESCE(pr.name, pr.email),
        NULL::uuid
      FROM professional_interest pr

      UNION ALL

      SELECT
        'waitlist',
        w.id::text,
        w.lead_status,
        w.owner,
        w.last_contacted_at,
        w.lead_notes,
        w.converted_at,
        w.created_at,
        w.email,
        w.utm_source,
        COALESCE(w.name, w.email),
        NULL::uuid
      FROM waitlist w
    ) leads
    WHERE 1=1 ${statusFilter} ${typeFilter}
    ORDER BY created_at DESC
    LIMIT $${idx}
    `,
    params
  );

  return rows;
}

async function updateLead(sourceType, id, fields) {
  const table = sourceType === 'package'
    ? 'package_interest'
    : sourceType === 'pedagog'
      ? 'professional_interest'
      : sourceType === 'waitlist'
        ? 'waitlist'
        : null;
  if (!table) throw Object.assign(new Error('Ogiltig lead-typ'), { statusCode: 400 });

  const sets = [];
  const params = [];
  let idx = 1;

  if (fields.lead_status !== undefined) {
    if (!LEAD_STATUSES.includes(fields.lead_status)) {
      throw Object.assign(new Error('Ogiltig lead_status'), { statusCode: 400 });
    }
    sets.push(`lead_status = $${idx++}`);
    params.push(fields.lead_status);
    if (fields.lead_status === 'konverterad') {
      sets.push(`converted_at = COALESCE(converted_at, NOW())`);
    }
  }
  if (fields.owner !== undefined) {
    sets.push(`owner = $${idx++}`);
    params.push(fields.owner || null);
  }
  if (fields.lead_notes !== undefined) {
    sets.push(`lead_notes = $${idx++}`);
    params.push(fields.lead_notes || null);
  }
  if (fields.last_contacted_at !== undefined) {
    sets.push(`last_contacted_at = $${idx++}`);
    params.push(fields.last_contacted_at || null);
  } else if (fields.lead_status === 'kontaktad') {
    sets.push('last_contacted_at = COALESCE(last_contacted_at, NOW())');
  }

  if (!sets.length) return null;

  const idCol = table === 'waitlist' || table === 'professional_interest' ? 'id' : 'id';
  params.push(id);

  const { rows } = await db.query(
    `UPDATE ${table} SET ${sets.join(', ')} WHERE ${idCol} = $${idx} RETURNING *`,
    params
  );
  return rows[0] || null;
}

async function countByStatus() {
  const { rows } = await db.query(`
    SELECT lead_status, COUNT(*)::int AS count FROM (
      SELECT lead_status FROM package_interest
      UNION ALL SELECT lead_status FROM professional_interest
      UNION ALL SELECT lead_status FROM waitlist
    ) x GROUP BY lead_status
  `);
  return rows;
}

module.exports = {
  LEAD_STATUSES,
  listPipeline,
  updateLead,
  countByStatus,
};
