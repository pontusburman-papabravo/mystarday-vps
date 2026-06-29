'use strict';

/**
 * Backfill schema_saved_at from earliest weekly_schedule per family.
 * Fixes KPI undercount when schedule was auto-seeded or created pre-milestone tracking.
 */

module.exports = {
  name: '1808940000000_backfill_schema_saved_at',

  up: async (client) => {
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
      SET schema_saved_at = sub.first_schedule_at,
          updated_at = NOW()
      FROM (
        SELECT c.family_id, MIN(ws.created_at) AS first_schedule_at
        FROM weekly_schedule ws
        JOIN child c ON c.id = ws.child_id
        JOIN family f ON f.id = c.family_id
        WHERE f.archived_at IS NULL
        GROUP BY c.family_id
      ) sub
      WHERE s.family_id = sub.family_id
        AND s.schema_saved_at IS NULL
      RETURNING s.family_id
    `);

    await client.query(`
      UPDATE family_activation_state s
      SET
        p0_activated_at = GREATEST(
          s.schema_saved_at,
          s.child_access_completed_at,
          s.first_completion_at
        ),
        p0_activated_within_48h = true,
        updated_at = NOW()
      WHERE s.p0_activated_at IS NULL
        AND s.schema_saved_at IS NOT NULL
        AND s.child_access_completed_at IS NOT NULL
        AND s.first_completion_at IS NOT NULL
        AND s.schema_saved_at <= s.signup_at + INTERVAL '48 hours'
        AND s.child_access_completed_at <= s.signup_at + INTERVAL '48 hours'
        AND s.first_completion_at <= s.signup_at + INTERVAL '48 hours'
    `);

    console.log(
      `[migration] backfill_schema_saved_at: updated ${backfill.rowCount} families`
    );
  },

  down: async () => {
    // Data backfill — no safe rollback
  },
};
