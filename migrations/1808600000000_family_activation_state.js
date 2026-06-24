'use strict';

/**
 * P0 activation snapshot per family (ACT-1 PR 1).
 */

module.exports = {
  name: '1808600000000_family_activation_state',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_activation_state (
        family_id UUID PRIMARY KEY REFERENCES family(id) ON DELETE CASCADE,
        signup_at TIMESTAMPTZ NOT NULL,
        schema_saved_at TIMESTAMPTZ,
        child_access_completed_at TIMESTAMPTZ,
        first_completion_at TIMESTAMPTZ,
        p0_activated_at TIMESTAMPTZ,
        p0_activated_within_48h BOOLEAN NOT NULL DEFAULT false,
        activation_variant VARCHAR(32) NOT NULL DEFAULT 'legacy'
          CHECK (activation_variant IN ('legacy', 'template_only', 'template_plus_ai')),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_activation_state_p0
        ON family_activation_state (p0_activated_within_48h, signup_at)
    `);
    await client.query(`
      INSERT INTO family_activation_state (family_id, signup_at, activation_variant)
      SELECT f.id, f.created_at, 'legacy'
      FROM family f
      WHERE NOT EXISTS (
        SELECT 1 FROM family_activation_state s WHERE s.family_id = f.id
      )
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS family_activation_state');
  },
};
