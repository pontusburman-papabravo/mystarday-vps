'use strict';

const db = require('../db');
const { ingestMilestone } = require('./ingest');
const { FLAG_KEYS, isFlagEnabled } = require('./flags');

/**
 * Nightly evaluation: established_routine + child_self_sufficient_week candidates.
 */
async function evaluateEstablishedRoutine(familyId) {
  const enabled = await isFlagEnabled(FLAG_KEYS.establishedPhase);
  if (!enabled) return false;

  const fam = await db.query(
    `SELECT f.id, fm.occurred_at AS first_success_at
     FROM family f
     LEFT JOIN family_milestones fm ON fm.family_id = f.id AND fm.milestone = 'first_success'
     WHERE f.id = $1`,
    [familyId]
  );
  const row = fam.rows[0];
  if (!row?.first_success_at) return false;

  const fsAt = new Date(row.first_success_at);
  const daysSince = (Date.now() - fsAt.getTime()) / 86_400_000;
  if (daysSince < 7) return false;

  const stats = await db.query(
    `SELECT
       COUNT(DISTINCT dli.completed_date)::int AS completion_days,
       COUNT(*)::int AS completions_7d
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     JOIN child c ON c.id = dl.child_id
     WHERE c.family_id = $1
       AND dli.completed = true
       AND dli.completed_date >= (CURRENT_DATE - INTERVAL '7 days')`,
    [familyId]
  );
  const { completion_days: completionDays, completions_7d: completions7d } = stats.rows[0] || {};
  if ((completionDays || 0) < 5 || (completions7d || 0) < 10) return false;

  const result = await ingestMilestone({
    familyId,
    milestone: 'established_routine',
    metadata: { completion_days: completionDays, completions_7d: completions7d },
  });
  return result.inserted;
}

async function evaluateIndependence(familyId) {
  const enabled = await isFlagEnabled(FLAG_KEYS.independencePhase);
  if (!enabled) return false;

  const result = await db.query(
    `SELECT COUNT(DISTINCT le.occurred_at::date)::int AS child_login_days
     FROM login_event le
     JOIN child c ON c.id = le.user_id
     WHERE c.family_id = $1
       AND le.role = 'child'
       AND le.occurred_at >= NOW() - INTERVAL '7 days'`,
    [familyId]
  );
  const days = result.rows[0]?.child_login_days || 0;
  if (days < 7) return false;

  const r = await ingestMilestone({
    familyId,
    milestone: 'child_self_sufficient_week',
    metadata: { child_login_days: days },
  });
  return r.inserted;
}

async function runJourneyPhaseEvaluationJob() {
  const families = await db.query(
    `SELECT id FROM family
     WHERE archived_at IS NULL
       AND journey_phase IN ('BUILDING_ROUTINE', 'ESTABLISHED_ROUTINE')
     LIMIT 500`
  );
  let established = 0;
  let independence = 0;
  for (const { id } of families.rows) {
    try {
      if (await evaluateEstablishedRoutine(id)) established++;
      if (await evaluateIndependence(id)) independence++;
    } catch (err) {
      console.error('[journey-phase-eval] family', id, err.message);
    }
  }
  if (established || independence) {
    console.log('[journey-phase-eval] established:', established, 'independence:', independence);
  }
}

module.exports = {
  evaluateEstablishedRoutine,
  evaluateIndependence,
  runJourneyPhaseEvaluationJob,
};
