'use strict';

/**
 * Shared definition of "family was active recently" for retention comms.
 * Active = parent login (login_event) OR child routine completion in the window.
 * Matches win-back / admin retention signals (works without analytics_events).
 */

/**
 * SQL boolean expression: family had activity within the last `days` days.
 * @param {string} familyIdColumn SQL expression for family UUID (e.g. 'p.family_id')
 * @param {number} days Positive integer day count
 * @returns {string}
 */
function sqlFamilyHadActivityWithinDays(familyIdColumn, days) {
  const d = Number(days);
  if (!Number.isInteger(d) || d < 1) {
    throw new Error('sqlFamilyHadActivityWithinDays: days must be a positive integer');
  }
  return `(
    EXISTS (
      SELECT 1 FROM login_event le
      WHERE le.family_id = ${familyIdColumn}
        AND le.occurred_at > NOW() - INTERVAL '${d} days'
    )
    OR EXISTS (
      SELECT 1 FROM daily_log_item dli
      JOIN daily_log dl ON dl.id = dli.daily_log_id
      JOIN child c ON c.id = dl.child_id
      WHERE c.family_id = ${familyIdColumn}
        AND dli.completed = true
        AND dli.completed_at IS NOT NULL
        AND dli.completed_at > NOW() - INTERVAL '${d} days'
    )
  )`;
}

module.exports = {
  sqlFamilyHadActivityWithinDays,
};
