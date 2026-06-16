'use strict';

/**
 * Migrated parents may lack notification_preference rows — win-back and weekly summary skip them.
 */
module.exports = {
  name: '1806400000000_backfill_notification_preference',

  up: async (client) => {
    await client.query(`
      INSERT INTO notification_preference (parent_id)
      SELECT p.id
      FROM parent p
      LEFT JOIN notification_preference np ON np.parent_id = p.id
      WHERE np.parent_id IS NULL
      ON CONFLICT (parent_id) DO NOTHING
    `);
  },
};
