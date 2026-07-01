'use strict';

/**
 * PR 1A — persist first-child timestamp on family_activation_state.
 */

module.exports = {
  name: '1809160000000_family_activation_state_child_created_at',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family_activation_state
      ADD COLUMN IF NOT EXISTS child_created_at TIMESTAMPTZ
    `);

    await client.query(`
      INSERT INTO family_activation_state (family_id, signup_at, activation_variant)
      SELECT f.id, f.created_at, 'legacy'
      FROM family f
      WHERE f.archived_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM family_activation_state s WHERE s.family_id = f.id
        )
      ON CONFLICT (family_id) DO NOTHING
    `);

    const backfill = await client.query(`
      UPDATE family_activation_state s
      SET child_created_at = sub.first_child_at,
          updated_at = NOW()
      FROM (
        SELECT c.family_id, MIN(c.created_at) AS first_child_at
        FROM child c
        JOIN family f ON f.id = c.family_id
        WHERE f.archived_at IS NULL
        GROUP BY c.family_id
      ) sub
      WHERE s.family_id = sub.family_id
        AND s.child_created_at IS NULL
      RETURNING s.family_id
    `);

    console.log(
      `[migration] family_activation_state.child_created_at: backfilled ${backfill.rowCount} families`
    );
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE family_activation_state
      DROP COLUMN IF EXISTS child_created_at
    `);
  },
};
