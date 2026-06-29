'use strict';

/**
 * Journey-owned retention push eligibility (ADR §2, §4.5).
 * Activity = days since last completion (not login). Gate owns allow/deny per family.
 */

const db = require('../db');
const { evaluateCommunicationGate } = require('./communication-gate');

const RETENTION_PUSH_MILESTONES = [3, 7, 14];

/**
 * Families with ever_completed where whole days since last completion equals milestoneDay.
 * Dedupes against retention_reengagement_push. Push prefs applied here (delivery layer).
 */
async function findEligibleRecipients(milestoneDay) {
  if (!RETENTION_PUSH_MILESTONES.includes(milestoneDay)) return [];

  const { rows } = await db.query(
    `
    WITH family_activity AS (
      SELECT
        fam.id AS family_id,
        (
          SELECT MAX(COALESCE(dli.completed_at, dli.completed_date::timestamptz))
          FROM daily_log_item dli
          JOIN daily_log dl ON dl.id = dli.daily_log_id
          JOIN child c ON c.id = dl.child_id
          WHERE c.family_id = fam.id AND dli.completed = true
        ) AS last_completion_at
      FROM family fam
      WHERE fam.archived_at IS NULL
    )
    SELECT DISTINCT p.id AS parent_id, fa.family_id
    FROM family_activity fa
    JOIN parent p ON p.family_id = fa.family_id
    WHERE fa.last_completion_at IS NOT NULL
      AND FLOOR(EXTRACT(EPOCH FROM (NOW() - fa.last_completion_at)) / 86400)::int = $1
      AND NOT EXISTS (
        SELECT 1 FROM retention_reengagement_push r
        WHERE r.parent_id = p.id
          AND r.family_id = fa.family_id
          AND r.milestone_day = $1
      )
      AND COALESCE((p.push_preferences->>'enabled')::boolean, true) = true
      AND COALESCE((p.push_preferences->>'inactivity_nudge')::boolean, true) = true
    `,
    [milestoneDay]
  );
  return rows;
}

/**
 * Journey Gate decision for one retention push (completion-based milestone).
 * @param {string} familyId
 * @param {{ milestoneDay: number }} opts
 */
async function evaluateRetentionPush(familyId, opts = {}) {
  return evaluateCommunicationGate(familyId, {
    channel: 'push',
    intent: 'retention_push',
    milestoneDay: opts.milestoneDay,
  });
}

module.exports = {
  RETENTION_PUSH_MILESTONES,
  findEligibleRecipients,
  evaluateRetentionPush,
};
