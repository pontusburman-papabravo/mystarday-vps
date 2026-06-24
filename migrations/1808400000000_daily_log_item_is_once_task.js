'use strict';

/**
 * Add is_once_task flag so engångsaktiviteter can link activity_template_id
 * (for sub-steps) without being treated as weekly schedule items.
 */

module.exports = {
  name: '1808400000000_daily_log_item_is_once_task',

  up: async (client) => {
    await client.query(`
      ALTER TABLE daily_log_item
      ADD COLUMN IF NOT EXISTS is_once_task BOOLEAN NOT NULL DEFAULT false
    `);
    await client.query(`
      UPDATE daily_log_item
      SET is_once_task = true
      WHERE activity_template_id IS NULL
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE daily_log_item
      DROP COLUMN IF EXISTS is_once_task
    `);
  },
};
