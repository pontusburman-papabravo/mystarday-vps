'use strict';

/**
 * Backfill onboarding_completed for families stuck after ACT-1 schema save,
 * and assign template_plus_ai to recent legacy signups when ACT-1 is live.
 */
module.exports = {
  name: '1809360000000_act1_onboarding_routing_fix',

  up: async (client) => {
    await client.query(`
      UPDATE parent p
      SET onboarding_completed = true
      FROM family f
      JOIN family_activation_state s ON s.family_id = f.id
      WHERE p.family_id = f.id
        AND f.archived_at IS NULL
        AND s.schema_saved_at IS NOT NULL
        AND p.onboarding_completed = false
    `);

    await client.query(`
      UPDATE family_activation_state s
      SET activation_variant = 'template_plus_ai'
      WHERE s.activation_variant = 'legacy'
        AND s.signup_at >= NOW() - INTERVAL '14 days'
        AND EXISTS (
          SELECT 1 FROM feature_flag
          WHERE key = 'activation_onboarding_v1' AND enabled = true
        )
    `);
  },

  down: async () => {
    // Data backfill — no rollback
  },
};
