'use strict';

const custodyDb = require('../../db/custody');
const { getDayOfWeek } = require('./schedule-date-utils');
const {
  loadCustodyContext,
  resolveCustodyDateSync,
} = require('./custody-schedule-engine');

/**
 * @deprecated Phase 5 — week_variant fallback until all rows have custody_home_id
 * @param {object|null} schedule
 * @param {string|null} homeId
 * @returns {'a'|'b'|null}
 */
function weekVariantForHomeId(schedule, homeId) {
  if (!schedule || !homeId || schedule.pattern_type !== 'alternate_weeks') {
    return null;
  }
  const config = schedule.configuration || {};
  const homeA = config.home_a || schedule.week_a_home_id;
  if (!homeA) return null;
  return homeId === homeA ? 'a' : 'b';
}

/**
 * @param {import('pg').Pool|import('pg').PoolClient} client
 * @param {string} childId
 * @param {number} dayOfWeek
 */
async function queryLegacyNullVariantSchedule(client, childId, dayOfWeek) {
  const legacy = await client.query(
    `SELECT id FROM weekly_schedule
     WHERE child_id = $1 AND day_of_week = $2 AND week_variant IS NULL
     LIMIT 1`,
    [childId, dayOfWeek]
  );
  return legacy.rows[0]?.id || null;
}

/**
 * Resolve weekly_schedule.id for a child on a calendar date (custody-aware).
 * Uses Schedule Engine for active home — no local date/variant logic.
 * @param {import('pg').Pool|import('pg').PoolClient} client
 * @param {string} childId
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} [timezone]
 */
async function resolveWeeklyScheduleId(client, childId, dateStr, timezone = 'Europe/Stockholm') {
  const dayOfWeek = getDayOfWeek(dateStr, timezone);

  try {
    const childRow = await client.query(
      'SELECT family_id FROM child WHERE id = $1',
      [childId]
    );
    const familyId = childRow.rows[0]?.family_id;
    if (!familyId) {
      return queryLegacyNullVariantSchedule(client, childId, dayOfWeek);
    }

    const engineCtx = await loadCustodyContext({ childId, familyId }, client);
    if (!engineCtx.schedule) {
      return queryLegacyNullVariantSchedule(client, childId, dayOfWeek);
    }

    const resolved = resolveCustodyDateSync(engineCtx, dateStr);
    const homeId = resolved.activeHome?.id;
    if (!homeId) {
      return queryLegacyNullVariantSchedule(client, childId, dayOfWeek);
    }

    const byHome = await client.query(
      `SELECT id FROM weekly_schedule
       WHERE child_id = $1 AND day_of_week = $2 AND custody_home_id = $3
       LIMIT 1`,
      [childId, dayOfWeek, homeId]
    );
    if (byHome.rows[0]) return byHome.rows[0].id;

    const variant = weekVariantForHomeId(engineCtx.schedule, homeId);
    if (variant) {
      const byVariant = await client.query(
        `SELECT id FROM weekly_schedule
         WHERE child_id = $1 AND day_of_week = $2 AND week_variant = $3
         LIMIT 1`,
        [childId, dayOfWeek, variant]
      );
      if (byVariant.rows[0]) return byVariant.rows[0].id;
    }

    return queryLegacyNullVariantSchedule(client, childId, dayOfWeek);
  } catch (err) {
    console.warn('[custody] resolveWeeklyScheduleId failed — falling back to legacy schedule:', err.message);
    return queryLegacyNullVariantSchedule(client, childId, dayOfWeek);
  }
}

module.exports = {
  weekVariantForHomeId,
  resolveWeeklyScheduleId,
};
