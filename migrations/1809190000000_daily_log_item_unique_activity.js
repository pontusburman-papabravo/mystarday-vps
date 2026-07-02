'use strict';

/**
 * Unique (daily_log_id, activity_template_id) prevents duplicate items when
 * getOrGenerateDailyLog runs concurrently (H3).
 */

exports.up = async (client) => {
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS daily_log_item_unique_activity_idx
      ON daily_log_item (daily_log_id, activity_template_id)
      WHERE activity_template_id IS NOT NULL
  `);
};

exports.down = async (client) => {
  await client.query('DROP INDEX IF EXISTS daily_log_item_unique_activity_idx');
};
