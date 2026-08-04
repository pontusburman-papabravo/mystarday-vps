'use strict';

/** Per delsteg: duration_seconds (samma regler som activity_template). */

module.exports = {
  name: '1809710000000_activity_sub_step_duration',

  up: async (client) => {
    await client.query(`
      ALTER TABLE activity_sub_step
        ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NULL
    `);
    await client.query(`
      ALTER TABLE activity_sub_step
        DROP CONSTRAINT IF EXISTS activity_sub_step_duration_seconds_range
    `);
    await client.query(`
      ALTER TABLE activity_sub_step
        ADD CONSTRAINT activity_sub_step_duration_seconds_range
        CHECK (duration_seconds IS NULL OR (duration_seconds >= 5 AND duration_seconds <= 3600))
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE activity_sub_step
        DROP CONSTRAINT IF EXISTS activity_sub_step_duration_seconds_range
    `);
    await client.query(`
      ALTER TABLE activity_sub_step DROP COLUMN IF EXISTS duration_seconds
    `);
  },
};
