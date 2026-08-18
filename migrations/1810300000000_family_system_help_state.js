'use strict';

/**
 * In-product system help for stuck families (shown/engaged/progression).
 * support_requested_at is separate — only set on explicit family opt-in.
 */

module.exports = {
  name: '1810300000000_family_system_help_state',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_system_help_state (
        family_id UUID PRIMARY KEY REFERENCES family(id) ON DELETE CASCADE,
        blocking_step VARCHAR(64) NOT NULL,
        help_type VARCHAR(64) NOT NULL,
        stuck_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        system_help_shown_at TIMESTAMPTZ,
        system_help_engaged_at TIMESTAMPTZ,
        support_requested_at TIMESTAMPTZ,
        next_milestone_at TIMESTAMPTZ,
        progression_outcome VARCHAR(32),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT family_system_help_outcome_chk CHECK (
          progression_outcome IS NULL
          OR progression_outcome IN ('progressed_24h', 'progressed_72h', 'no_progress')
        )
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_system_help_shown
        ON family_system_help_state (system_help_shown_at DESC)
        WHERE system_help_shown_at IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_system_help_outcome_pending
        ON family_system_help_state (system_help_shown_at)
        WHERE progression_outcome IS NULL AND next_milestone_at IS NULL
    `);
    await client.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES (
        'growth_system_help_v1',
        false,
        'Contextual in-app system help for stuck families (48h–14d)'
      )
      ON CONFLICT (key) DO NOTHING
    `);
  },

  down: async (client) => {
    await client.query(`DELETE FROM feature_flag WHERE key = 'growth_system_help_v1'`);
    await client.query('DROP TABLE IF EXISTS family_system_help_state');
  },
};
