'use strict';

/**
 * M5 — push-reminder-scheduler dup checks filter on parent_id + type + created_at.
 */
module.exports = {
  name: '1809200000000_notification_log_dup_check_idx',

  up: async (client) => {
    await client.query(`
      CREATE INDEX IF NOT EXISTS notification_log_dup_check_idx
        ON notification_log (parent_id, type, created_at DESC)
    `);
  },

  down: async (client) => {
    await client.query(`
      DROP INDEX IF EXISTS notification_log_dup_check_idx
    `);
  },
};
