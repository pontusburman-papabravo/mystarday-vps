'use strict';

/**
 * Aktivitetstimer v0.3 — duration_seconds on activity, master flag on child.
 */
module.exports = {
  name: '1809530000000_activity_timers',

  up: async (client) => {
    await client.query(`
      ALTER TABLE child
        ADD COLUMN IF NOT EXISTS activity_timers_enabled BOOLEAN NOT NULL DEFAULT false
    `);
    await client.query(`
      ALTER TABLE activity_template
        ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NULL
    `);
    await client.query(`
      ALTER TABLE activity_template
        DROP CONSTRAINT IF EXISTS activity_template_duration_seconds_range
    `);
    await client.query(`
      ALTER TABLE activity_template
        ADD CONSTRAINT activity_template_duration_seconds_range
        CHECK (duration_seconds IS NULL OR (duration_seconds >= 5 AND duration_seconds <= 3600))
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE activity_template DROP CONSTRAINT IF EXISTS activity_template_duration_seconds_range
    `);
    await client.query(`
      ALTER TABLE activity_template DROP COLUMN IF EXISTS duration_seconds
    `);
    await client.query(`
      ALTER TABLE child DROP COLUMN IF EXISTS activity_timers_enabled
    `);
  },
};
