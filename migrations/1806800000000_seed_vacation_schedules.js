'use strict';

const { VACATION_SCHEDULES } = require('../src/lib/default-vacation-schedules');

/**
 * Seed standard library schedules for school breaks: Lov, Sommarlov, Jullov.
 * Idempotent — skips schedules that already exist by name.
 */
module.exports = {
  name: '1806800000000_seed_vacation_schedules',

  up: async (client) => {
    for (const schedule of VACATION_SCHEDULES) {
      const existing = await client.query(
        'SELECT id FROM default_schedule WHERE name = $1 LIMIT 1',
        [schedule.name]
      );
      if (existing.rows.length > 0) continue;

      const inserted = await client.query(
        `INSERT INTO default_schedule (name, description, icon, sort_order)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [schedule.name, schedule.description, schedule.icon, schedule.sort_order]
      );
      const scheduleId = inserted.rows[0].id;

      for (const item of schedule.items) {
        await client.query(
          `INSERT INTO default_schedule_item
             (default_schedule_id, name, icon, section, star_value, start_time, end_time, sort_order, sub_steps)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            scheduleId,
            item.name,
            item.icon,
            item.section,
            item.star_value,
            item.start_time || null,
            item.end_time || null,
            item.sort_order,
            JSON.stringify(item.sub_steps || []),
          ]
        );
      }
    }
  },
};
