'use strict';

/**
 * Star-milestone push dedup in push-reminder-scheduler reads notification_log.metadata.
 * Column was missing in schema — caused prod [PUSH-REMINDER] Job error on milestone sends.
 */
module.exports = {
  name: '1809100000000_notification_log_metadata',

  up: async (client) => {
    await client.query(`
      ALTER TABLE notification_log
      ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE notification_log
      DROP COLUMN IF EXISTS metadata
    `);
  },
};
