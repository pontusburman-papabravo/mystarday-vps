'use strict';

/**
 * One temporary first-star starter per daily log (child + local calendar day).
 */

module.exports = {
  name: '1810110000000_first_star_starter_kind',

  up: async (client) => {
    await client.query(`
      ALTER TABLE daily_log_item
      ADD COLUMN IF NOT EXISTS starter_kind VARCHAR(32)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS daily_log_item_first_star_starter_per_log
      ON daily_log_item (daily_log_id)
      WHERE starter_kind = 'first_star'
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS daily_log_item_first_star_starter_per_log');
    await client.query('ALTER TABLE daily_log_item DROP COLUMN IF EXISTS starter_kind');
  },
};
