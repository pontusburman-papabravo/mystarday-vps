'use strict';

/**
 * #1023 PR A — durable server-side activation step defer metadata.
 */

const migration = {
  name: '1810300000000_family_activation_step_deferrals',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family_activation_state
        ADD COLUMN IF NOT EXISTS step_deferrals JSONB NOT NULL DEFAULT '{}'::jsonb
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE family_activation_state
        DROP COLUMN IF EXISTS step_deferrals
    `);
  },
};

migration.snapshotContract = {
  backwardCompatible: true,
  schemaOnly: true,
};

module.exports = migration;
