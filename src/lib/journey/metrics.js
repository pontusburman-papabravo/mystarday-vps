'use strict';

const db = require('../db');
const { getPhaseDistribution } = require('./rollout');

/**
 * Families with handoff_started that reached child_logged_in.
 */
async function getHandoffCompletionRate() {
  const result = await db.query(
    `WITH started AS (
       SELECT DISTINCT family_id FROM family_milestones WHERE milestone = 'handoff_started'
     ),
     completed AS (
       SELECT DISTINCT s.family_id
       FROM started s
       INNER JOIN family_milestones m
         ON m.family_id = s.family_id AND m.milestone = 'child_logged_in'
     )
     SELECT
       (SELECT COUNT(*)::int FROM started) AS handoff_started_families,
       (SELECT COUNT(*)::int FROM completed) AS handoff_completed_families`
  );
  const row = result.rows[0] || {};
  const started = row.handoff_started_families || 0;
  const completed = row.handoff_completed_families || 0;
  return {
    handoff_started_families: started,
    handoff_completed_families: completed,
    handoff_completion_rate: started === 0 ? null : Math.round((completed / started) * 10000) / 100,
  };
}

async function getJourneyFas2Metrics() {
  const [handoff, phase_distribution] = await Promise.all([
    getHandoffCompletionRate(),
    getPhaseDistribution(),
  ]);
  return { ...handoff, phase_distribution };
}

module.exports = {
  getHandoffCompletionRate,
  getJourneyFas2Metrics,
};
