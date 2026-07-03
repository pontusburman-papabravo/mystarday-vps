'use strict';

/**
 * ACT-1 AI-only — enable AI starter plan globally; backfill variant for in-progress onboarding.
 */

module.exports = {
  name: '1809340000000_act1_ai_only',

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, $2)
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      ['activation_ai_starter_plan', 'ACT-1 AI personalization on starter plan (AI-only rollout)']
    );

    await client.query(
      `UPDATE family_activation_state s
       SET activation_variant = 'template_plus_ai'
       WHERE s.activation_variant IN ('legacy', 'template_only')
         AND EXISTS (
           SELECT 1 FROM parent p
           WHERE p.family_id = s.family_id
             AND p.onboarding_completed = false
         )`
    );
  },

  down: async (client) => {
    // Intentionally no variant rollback — historical assignments are not restored.
    await client.query(
      `UPDATE feature_flag SET enabled = false WHERE key = 'activation_ai_starter_plan'`
    );
  },
};
