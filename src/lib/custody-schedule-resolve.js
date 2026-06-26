'use strict';

const custodyDb = require('../../db/custody');
const { getWeekVariantForDate } = require('./custody-resolver');
const { getDayOfWeek } = require('./schedule-date-utils');

/**
 * Resolve weekly_schedule.id for a child on a calendar date (custody-aware).
 * @param {import('pg').Pool|import('pg').PoolClient} client
 * @param {string} childId
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} [timezone]
 */
async function resolveWeeklyScheduleId(client, childId, dateStr, timezone = 'Europe/Stockholm') {
  const dayOfWeek = getDayOfWeek(dateStr, timezone);
  let pattern = null;
  try {
    pattern = await custodyDb.getPattern(childId, client);
  } catch (err) {
    console.warn('[custody] getPattern failed — falling back to legacy schedule:', err.message);
  }

  if (!pattern) {
    const legacy = await client.query(
      `SELECT id FROM weekly_schedule
       WHERE child_id = $1 AND day_of_week = $2 AND week_variant IS NULL
       LIMIT 1`,
      [childId, dayOfWeek]
    );
    return legacy.rows[0]?.id || null;
  }

  const variant = getWeekVariantForDate(pattern, dateStr);
  const match = await client.query(
    `SELECT id FROM weekly_schedule
     WHERE child_id = $1 AND day_of_week = $2 AND week_variant = $3
     LIMIT 1`,
    [childId, dayOfWeek, variant]
  );
  if (match.rows[0]) return match.rows[0].id;

  const legacy = await client.query(
    `SELECT id FROM weekly_schedule
     WHERE child_id = $1 AND day_of_week = $2 AND week_variant IS NULL
     LIMIT 1`,
    [childId, dayOfWeek]
  );
  return legacy.rows[0]?.id || null;
}

module.exports = {
  resolveWeeklyScheduleId,
};
