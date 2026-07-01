'use strict';

/**
 * FEAT-1 Phase 2 — custody_schedule domain columns (pattern_type + configuration).
 * Backfills existing alternate_weeks rows from legacy week_a/week_b home IDs.
 */

module.exports = {
  name: '1808970000000_custody_schedule_domain',

  up: async (client) => {
    await client.query(`
      ALTER TABLE custody_home
        ADD COLUMN IF NOT EXISTS icon VARCHAR(32)
    `);

    await client.query(`
      ALTER TABLE custody_pattern
        ADD COLUMN IF NOT EXISTS pattern_type VARCHAR(32) NOT NULL DEFAULT 'alternate_weeks',
        ADD COLUMN IF NOT EXISTS configuration JSONB NOT NULL DEFAULT '{}'::jsonb
    `);

    await client.query(`
      UPDATE custody_pattern
      SET
        pattern_type = 'alternate_weeks',
        configuration = jsonb_build_object(
          'home_a', week_a_home_id::text,
          'home_b', week_b_home_id::text
        )
      WHERE configuration = '{}'::jsonb
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_custody_pattern_type
        ON custody_pattern (pattern_type)
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_custody_pattern_type');
    await client.query(`
      ALTER TABLE custody_pattern
        DROP COLUMN IF EXISTS configuration,
        DROP COLUMN IF EXISTS pattern_type
    `);
    await client.query(`
      ALTER TABLE custody_home
        DROP COLUMN IF EXISTS icon
    `);
  },
};
