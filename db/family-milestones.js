'use strict';

const db = require('../src/lib/db');

const ONCE_MILESTONES = new Set([
  'account_created',
  'child_created',
  'routine_ready',
  'rewards_ready',
  'first_success',
]);

/**
 * @param {string} familyId
 * @returns {Promise<Record<string, string>>} milestone → ISO occurred_at
 */
async function getMilestoneMap(familyId, client = db) {
  const result = await client.query(
    `SELECT milestone, occurred_at, metadata
     FROM family_milestones
     WHERE family_id = $1
     ORDER BY occurred_at ASC`,
    [familyId]
  );
  const map = {};
  for (const row of result.rows) {
    const iso = row.occurred_at instanceof Date
      ? row.occurred_at.toISOString()
      : new Date(row.occurred_at).toISOString();
    map[row.milestone] = iso;
    if (row.metadata?.celebration_shown) {
      map._celebration_shown = true;
    }
  }
  return map;
}

/**
 * @param {string} familyId
 * @returns {Promise<object[]>}
 */
async function listRaw(familyId, client = db) {
  const result = await client.query(
    `SELECT id, milestone, occurred_at, child_id, metadata, source, created_at
     FROM family_milestones
     WHERE family_id = $1
     ORDER BY occurred_at ASC`,
    [familyId]
  );
  return result.rows;
}

/**
 * Idempotent insert for once-milestones; best-effort dedupe for repeatable.
 * @returns {Promise<{ inserted: boolean, row: object|null }>}
 */
async function insertMilestone({
  familyId,
  milestone,
  childId = null,
  metadata = {},
  source = 'system',
  occurredAt = null,
}, client = db) {
  const params = [familyId, milestone, childId, JSON.stringify(metadata), source];
  let sql;
  if (ONCE_MILESTONES.has(milestone)) {
    sql = `
      INSERT INTO family_milestones (family_id, milestone, child_id, metadata, source${occurredAt ? ', occurred_at' : ''})
      VALUES ($1, $2, $3, $4::jsonb, $5${occurredAt ? ', $6' : ''})
      ON CONFLICT (family_id, milestone)
        WHERE milestone IN (
          'account_created', 'child_created', 'routine_ready', 'rewards_ready', 'first_success'
        )
      DO NOTHING
      RETURNING *
    `;
    if (occurredAt) params.push(occurredAt);
  } else {
    // Repeatable: skip if identical milestone already exists (idempotency for handoff etc.)
    const existing = await client.query(
      `SELECT 1 FROM family_milestones
       WHERE family_id = $1 AND milestone = $2
       LIMIT 1`,
      [familyId, milestone]
    );
    if (existing.rows.length > 0) {
      return { inserted: false, row: null };
    }
    sql = `
      INSERT INTO family_milestones (family_id, milestone, child_id, metadata, source${occurredAt ? ', occurred_at' : ''})
      VALUES ($1, $2, $3, $4::jsonb, $5${occurredAt ? ', $6' : ''})
      RETURNING *
    `;
    if (occurredAt) params.push(occurredAt);
  }

  const result = await client.query(sql, params);
  return { inserted: result.rows.length > 0, row: result.rows[0] || null };
}

async function markCelebrationShown(familyId, client = db) {
  await client.query(
    `UPDATE family_milestones
     SET metadata = metadata || '{"celebration_shown": true}'::jsonb
     WHERE family_id = $1 AND milestone = 'first_success'`,
    [familyId]
  );
}

async function getJourneyPhase(familyId, client = db) {
  const result = await client.query(
    'SELECT journey_phase FROM family WHERE id = $1',
    [familyId]
  );
  return result.rows[0]?.journey_phase || 'SETTING_UP';
}

async function setJourneyPhase(familyId, phase, client = db) {
  await client.query(
    'UPDATE family SET journey_phase = $2 WHERE id = $1',
    [familyId, phase]
  );
}

module.exports = {
  ONCE_MILESTONES,
  getMilestoneMap,
  listRaw,
  insertMilestone,
  markCelebrationShown,
  getJourneyPhase,
  setJourneyPhase,
};
