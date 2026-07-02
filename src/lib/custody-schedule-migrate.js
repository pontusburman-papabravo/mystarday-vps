'use strict';

/**
 * Promote legacy weekly_schedule rows to week A and clone to week B.
 * Phase 5: backfill custody_home_id on existing A/B rows from pattern configuration.
 */

/**
 * Backfill weekly_schedule.custody_home_id from custody_pattern configuration.
 * Idempotent — only updates rows where custody_home_id IS NULL.
 * @param {import('pg').PoolClient} client
 * @returns {Promise<number>} rows updated
 */
async function backfillWeeklyScheduleHomeIds(client) {
  const result = await client.query(`
    UPDATE weekly_schedule ws
    SET custody_home_id = CASE ws.week_variant
      WHEN 'a' THEN COALESCE(
        (cp.configuration->>'home_a')::uuid,
        (cp.configuration->>'weekend_home_a')::uuid,
        cp.week_a_home_id
      )
      WHEN 'b' THEN COALESCE(
        (cp.configuration->>'home_b')::uuid,
        (cp.configuration->>'weekend_home_b')::uuid,
        cp.week_b_home_id
      )
    END
    FROM custody_pattern cp
    WHERE ws.child_id = cp.child_id
      AND ws.week_variant IS NOT NULL
      AND ws.custody_home_id IS NULL
    RETURNING ws.id
  `);
  return result.rowCount;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} childId
 * @param {string} weekAHomeId
 */
async function promoteLegacyScheduleToWeekA(client, childId, weekAHomeId) {
  await client.query(
    `UPDATE weekly_schedule
     SET week_variant = 'a', custody_home_id = $2
     WHERE child_id = $1 AND week_variant IS NULL`,
    [childId, weekAHomeId]
  );
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} childId
 * @param {string} weekBHomeId
 */
async function cloneWeekAToWeekB(client, childId, weekBHomeId) {
  const schedules = await client.query(
    `SELECT id, day_of_week, name, sort_order
     FROM weekly_schedule
     WHERE child_id = $1 AND week_variant = 'a'
     ORDER BY day_of_week ASC`,
    [childId]
  );

  for (const ws of schedules.rows) {
    const existing = await client.query(
      `SELECT id FROM weekly_schedule
       WHERE child_id = $1 AND day_of_week = $2 AND week_variant = 'b'`,
      [childId, ws.day_of_week]
    );

    let weekBScheduleId;
    if (existing.rows[0]) {
      weekBScheduleId = existing.rows[0].id;
      await client.query(
        'DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1',
        [weekBScheduleId]
      );
      await client.query(
        `UPDATE weekly_schedule
         SET name = $2, sort_order = $3, custody_home_id = $4
         WHERE id = $1`,
        [weekBScheduleId, ws.name, ws.sort_order, weekBHomeId]
      );
    } else {
      const ins = await client.query(
        `INSERT INTO weekly_schedule (
           child_id, day_of_week, name, sort_order, week_variant, custody_home_id
         ) VALUES ($1, $2, $3, $4, 'b', $5)
         RETURNING id`,
        [childId, ws.day_of_week, ws.name, ws.sort_order, weekBHomeId]
      );
      weekBScheduleId = ins.rows[0].id;
    }

    await client.query(
      `INSERT INTO weekly_schedule_item (
         weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section
       )
       SELECT $1, activity_template_id, start_time, end_time, sort_order, section
       FROM weekly_schedule_item
       WHERE weekly_schedule_id = $2`,
      [weekBScheduleId, ws.id]
    );
  }
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} childId
 * @param {string} weekAHomeId
 * @param {string} weekBHomeId
 */
async function migrateChildScheduleToCustody(client, childId, weekAHomeId, weekBHomeId) {
  await promoteLegacyScheduleToWeekA(client, childId, weekAHomeId);
  await cloneWeekAToWeekB(client, childId, weekBHomeId);
}

module.exports = {
  backfillWeeklyScheduleHomeIds,
  promoteLegacyScheduleToWeekA,
  cloneWeekAToWeekB,
  migrateChildScheduleToCustody,
};
