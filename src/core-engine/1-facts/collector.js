'use strict';

/**
 * Sole DB entry point for Engine facts.
 * No other module may query activation/routine/star tables for product decisions.
 */

const db = require('../../lib/db');

/**
 * @param {import('./types').FamilyFacts} row
 * @returns {import('./types').FamilyFacts}
 */
function normalizeFamilyFacts(row) {
  const signupAt = row.signupAt instanceof Date ? row.signupAt : new Date(row.signupAt);
  return {
    familyId: String(row.familyId),
    signupAt,
    childrenIds: Array.isArray(row.childrenIds) ? [...row.childrenIds] : [],
    totalCompletions: Number(row.totalCompletions) || 0,
    firstCompletionAt: row.firstCompletionAt ? new Date(row.firstCompletionAt) : null,
    lastCompletionAt: row.lastCompletionAt ? new Date(row.lastCompletionAt) : null,
    firstDayCompletedAt: row.firstDayCompletedAt ? new Date(row.firstDayCompletedAt) : null,
    currentStreakDays: Number(row.currentStreakDays) || 0,
    hasSeenChildView: Boolean(row.hasSeenChildView),
    hasRoutine: Boolean(row.hasRoutine),
    hasEveningRoutine: Boolean(row.hasEveningRoutine),
    rewardsClaimedCount: Number(row.rewardsClaimedCount) || 0,
    coParentCount: Number(row.coParentCount) || 1,
    openedCustomize: Boolean(row.openedCustomize),
    _incomplete: Boolean(row._incomplete),
  };
}

/**
 * @param {string} familyId
 * @returns {Promise<import('./types').FamilyFacts>}
 */
async function collectFamilyFacts(familyId) {
  const [familyRes, activationRes, childrenRes, parentsRes, eveningRes, rewardsRes, streakRes, completionsRes] =
    await Promise.all([
      db.query('SELECT id, created_at FROM family WHERE id = $1', [familyId]),
      db.query(
        `SELECT schema_saved_at, child_access_completed_at, first_completion_at
         FROM family_activation_state WHERE family_id = $1`,
        [familyId]
      ),
      db.query('SELECT id FROM child WHERE family_id = $1 ORDER BY created_at', [familyId]),
      db.query('SELECT count(*)::int AS n FROM parent WHERE family_id = $1', [familyId]),
      db.query(
        `SELECT EXISTS (
           SELECT 1 FROM weekly_schedule ws
           JOIN weekly_schedule_item wsi ON wsi.weekly_schedule_id = ws.id
           JOIN child c ON c.id = ws.child_id AND c.family_id = $1
           WHERE wsi.section = 'kvall'
         ) AS has_evening`,
        [familyId]
      ),
      db.query(
        `SELECT count(*)::int AS n FROM reward_redemption rr
         JOIN child c ON c.id = rr.child_id AND c.family_id = $1`,
        [familyId]
      ),
      db.query(
        `SELECT COALESCE(max(s.current_streak), 0)::int AS streak
         FROM streak s JOIN child c ON c.id = s.child_id AND c.family_id = $1`,
        [familyId]
      ),
      db.query(
        `SELECT count(*)::int AS total, max(dli.completed_at) AS last_at
         FROM daily_log dl
         JOIN daily_log_item dli ON dli.daily_log_id = dl.id AND dli.completed_at IS NOT NULL
         JOIN child c ON c.id = dl.child_id AND c.family_id = $1`,
        [familyId]
      ),
    ]);

  if (!familyRes.rows[0]) {
    return normalizeFamilyFacts({
      familyId,
      signupAt: new Date(),
      childrenIds: [],
      totalCompletions: 0,
      firstCompletionAt: null,
      lastCompletionAt: null,
      currentStreakDays: 0,
      hasSeenChildView: false,
      hasRoutine: false,
      hasEveningRoutine: false,
      rewardsClaimedCount: 0,
      _incomplete: true,
    });
  }

  const activation = activationRes.rows[0] || {};
  const childrenIds = childrenRes.rows.map((r) => String(r.id));

  return normalizeFamilyFacts({
    familyId,
    signupAt: familyRes.rows[0].created_at,
    childrenIds,
    totalCompletions: completionsRes.rows[0]?.total || 0,
    firstCompletionAt: activation.first_completion_at || null,
    lastCompletionAt: completionsRes.rows[0]?.last_at || null,
    firstDayCompletedAt: null,
    currentStreakDays: streakRes.rows[0]?.streak || 0,
    hasSeenChildView: Boolean(activation.child_access_completed_at),
    hasRoutine: Boolean(activation.schema_saved_at),
    hasEveningRoutine: Boolean(eveningRes.rows[0]?.has_evening),
    rewardsClaimedCount: rewardsRes.rows[0]?.n || 0,
    coParentCount: parentsRes.rows[0]?.n || 1,
    _incomplete: false,
  });
}

module.exports = {
  collectFamilyFacts,
  normalizeFamilyFacts,
};
