'use strict';

const db = require('../src/lib/db');
const { sqlFamilyHadActivityWithinDays } = require('../src/lib/family-recent-activity');

const SKIP_REASON_INACTIVE_4_WEEKS = 'inactive_4_weeks';

/**
 * Record opted-in parents skipped from weekly summary due to long inactivity.
 * One row per parent per week (idempotent).
 * @param {string} weekEndDate YYYY-MM-DD (Stockholm Sunday)
 * @param {number} activityWindowDays
 * @returns {Promise<number>} rows inserted
 */
async function recordInactiveParentsForWeek(weekEndDate, activityWindowDays) {
  const activeSql = sqlFamilyHadActivityWithinDays('p.family_id', activityWindowDays);
  const { rowCount } = await db.query(
    `INSERT INTO weekly_summary_inactive_log (parent_id, family_id, week_end_date, skip_reason)
     SELECT p.id, p.family_id, $1::date, $2
     FROM parent p
     JOIN notification_preference np ON np.parent_id = p.id
     WHERE np.weekly_summary = true
       AND np.email_enabled = true
       AND p.verified = true
       AND NOT ${activeSql}
     ON CONFLICT (parent_id, week_end_date) DO NOTHING`,
    [weekEndDate, SKIP_REASON_INACTIVE_4_WEEKS]
  );
  return rowCount || 0;
}

module.exports = {
  SKIP_REASON_INACTIVE_4_WEEKS,
  recordInactiveParentsForWeek,
};
