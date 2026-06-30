'use strict';

const db = require('../src/lib/db');

const ONCE_MILESTONES = new Set([
  'account_created',
  'child_created',
  'routine_ready',
  'rewards_ready',
  'first_success',
  'established_routine',
  'child_self_sufficient_week',
  'second_child_created',
  'coparent_joined',
  'week_reflection_completed',
  'month_reflection_completed',
]);

const SCOPED_ONCE_MILESTONES = new Set([
  'child_logged_in',
  'handoff_started',
  'handoff_deferred',
  'parent_saw_completion',
  'established_routine',
  'child_self_sufficient_week',
  'second_child_created',
  'coparent_joined',
]);

function scopeKeyForChild(childId) {
  return childId ? `child:${childId}` : '';
}

/**
 * @param {string} familyId
 * @returns {Promise<Record<string, unknown>>}
 */
async function getMilestoneMap(familyId, client = db) {
  const result = await client.query(
    `SELECT milestone, occurred_at, metadata, child_id, scope_key
     FROM family_milestones
     WHERE family_id = $1
     ORDER BY occurred_at ASC`,
    [familyId]
  );
  const map = {};
  const childrenLoggedIn = new Set();
  let pendingHandoffChildId = null;

  for (const row of result.rows) {
    const iso = row.occurred_at instanceof Date
      ? row.occurred_at.toISOString()
      : new Date(row.occurred_at).toISOString();

    if (row.milestone === 'first_week_day_dismissed') {
      const dayNum = row.scope_key?.replace('day:', '') || row.metadata?.day;
      if (dayNum) map[`fw_day_dismissed_${dayNum}`] = iso;
      continue;
    }

    if (row.milestone === 'first_month_moment_dismissed') {
      const momentKey = row.scope_key?.replace('moment:', '') || row.metadata?.moment;
      if (momentKey) map[`fm_dismissed_${momentKey}`] = iso;
      continue;
    }

    if (row.milestone === 'child_logged_in') {
      const cid = row.child_id || (row.scope_key?.startsWith('child:') ? row.scope_key.slice(6) : null);
      if (cid) childrenLoggedIn.add(cid);
      if (!map.child_logged_in) map.child_logged_in = iso;
      continue;
    }

    if (row.milestone === 'second_child_created' && row.child_id) {
      pendingHandoffChildId = row.child_id;
    }

    map[row.milestone] = iso;
    if (row.metadata?.celebration_shown) map._celebration_shown = true;
    if (row.metadata?.daily_log_item_id) {
      map._pending_ack_item_id = row.metadata.daily_log_item_id;
    }
  }

  if (childrenLoggedIn.size) map._children_logged_in = [...childrenLoggedIn];
  if (pendingHandoffChildId) map._pending_handoff_child_id = pendingHandoffChildId;

  return map;
}

async function listRaw(familyId, client = db) {
  const result = await client.query(
    `SELECT id, milestone, occurred_at, child_id, scope_key, metadata, source, created_at
     FROM family_milestones
     WHERE family_id = $1
     ORDER BY occurred_at ASC`,
    [familyId]
  );
  return result.rows;
}

async function insertMilestone({
  familyId,
  milestone,
  childId = null,
  scopeKey = '',
  metadata = {},
  source = 'system',
  occurredAt = null,
}, client = db) {
  const sk = scopeKey || (childId ? scopeKeyForChild(childId) : '');
  const params = [familyId, milestone, childId, sk, JSON.stringify(metadata), source];
  const timeCol = occurredAt ? ', occurred_at' : '';
  const timeVal = occurredAt ? ', $7' : '';
  if (occurredAt) params.push(occurredAt);

  if (ONCE_MILESTONES.has(milestone) && !SCOPED_ONCE_MILESTONES.has(milestone)) {
    const sql = `
      INSERT INTO family_milestones (family_id, milestone, child_id, scope_key, metadata, source${timeCol})
      VALUES ($1, $2, $3, $4, $5::jsonb, $6${timeVal})
      ON CONFLICT (family_id, milestone)
        WHERE milestone IN (
          'account_created', 'child_created', 'routine_ready', 'rewards_ready', 'first_success',
          'week_reflection_completed', 'month_reflection_completed'
        )
      DO NOTHING
      RETURNING *
    `;
    const result = await client.query(sql, params);
    return { inserted: result.rows.length > 0, row: result.rows[0] || null };
  }

  if (SCOPED_ONCE_MILESTONES.has(milestone)) {
    const sql = `
      INSERT INTO family_milestones (family_id, milestone, child_id, scope_key, metadata, source${timeCol})
      VALUES ($1, $2, $3, $4, $5::jsonb, $6${timeVal})
      ON CONFLICT (family_id, milestone, scope_key)
        WHERE milestone IN (
          'child_logged_in', 'handoff_started', 'handoff_deferred',
          'established_routine', 'child_self_sufficient_week',
          'second_child_created', 'coparent_joined', 'parent_saw_completion'
        )
      DO NOTHING
      RETURNING *
    `;
    const result = await client.query(sql, params);
    return { inserted: result.rows.length > 0, row: result.rows[0] || null };
  }

  const existing = await client.query(
    `SELECT 1 FROM family_milestones
     WHERE family_id = $1 AND milestone = $2 AND scope_key = $3
     LIMIT 1`,
    [familyId, milestone, sk]
  );
  if (existing.rows.length > 0) return { inserted: false, row: null };

  const sql = `
    INSERT INTO family_milestones (family_id, milestone, child_id, scope_key, metadata, source${timeCol})
    VALUES ($1, $2, $3, $4, $5::jsonb, $6${timeVal})
    RETURNING *
  `;
  const result = await client.query(sql, params);
  return { inserted: result.rows.length > 0, row: result.rows[0] || null };
}

async function markCelebrationShown(familyId, client = require('../src/lib/db')) {
  await client.query(
    `UPDATE family_milestones
     SET metadata = metadata || '{"celebration_shown": true}'::jsonb
     WHERE family_id = $1 AND milestone = 'first_success'`,
    [familyId]
  );
}

async function getJourneyPhase(familyId, client = require('../src/lib/db')) {
  const result = await client.query(
    'SELECT journey_phase FROM family WHERE id = $1',
    [familyId]
  );
  return result.rows[0]?.journey_phase || 'SETTING_UP';
}

async function setJourneyPhase(familyId, phase, client = require('../src/lib/db')) {
  await client.query(
    'UPDATE family SET journey_phase = $2 WHERE id = $1',
    [familyId, phase]
  );
}

module.exports = {
  ONCE_MILESTONES,
  SCOPED_ONCE_MILESTONES,
  scopeKeyForChild,
  getMilestoneMap,
  listRaw,
  insertMilestone,
  markCelebrationShown,
  getJourneyPhase,
  setJourneyPhase,
};
