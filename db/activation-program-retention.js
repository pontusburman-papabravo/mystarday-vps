/**
 * db/activation-program-retention.js
 * Cohort queries for activation program retention (Fas 6A).
 */

const db = require('../src/lib/db');

/**
 * Programs in the post-launch experiment cohort.
 * @param {string} launchAtIso — ACTIVATION_PROGRAM_LAUNCH_AT
 */
async function listCohortPrograms(launchAtIso, client = db) {
  if (!launchAtIso) return [];

  const result = await client.query(
    `SELECT pap.*,
            COALESCE(f.timezone, 'Europe/Stockholm') AS family_timezone
     FROM parent_activation_program pap
     JOIN family f ON f.id = pap.family_id
     WHERE pap.program_type = 'onboarding_7d'
       AND pap.created_at >= $1::timestamptz
       AND pap.cohort_arm IN ('treatment', 'control')
     ORDER BY pap.started_at ASC`,
    [launchAtIso]
  );
  return result.rows;
}

/**
 * Retention events for one family in [rangeStart, rangeEnd) UTC.
 * parent_login: enrolling parent only. child_completion: any child in family.
 */
async function fetchRetentionEvents(
  { familyId, parentId, rangeStart, rangeEnd },
  client = db
) {
  const result = await client.query(
    `SELECT 'parent_login' AS type, le.occurred_at AS at
     FROM login_event le
     WHERE le.family_id = $1
       AND le.user_id = $2
       AND le.role = 'parent'
       AND le.occurred_at >= $3::timestamptz
       AND le.occurred_at < $4::timestamptz
     UNION ALL
     SELECT 'child_completion' AS type, dli.completed_at AS at
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     JOIN child c ON c.id = dl.child_id
     WHERE c.family_id = $1
       AND dli.completed = true
       AND dli.completed_at IS NOT NULL
       AND dli.completed_at >= $3::timestamptz
       AND dli.completed_at < $4::timestamptz`,
    [familyId, parentId, rangeStart, rangeEnd]
  );
  return result.rows;
}

module.exports = {
  listCohortPrograms,
  fetchRetentionEvents,
};
