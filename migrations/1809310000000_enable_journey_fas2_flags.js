'use strict';

/**
 * Enable Journey Fas 2 — registry v2, context-only handoff, parent-ack modal.
 * Wave 1 flags (ingest, evaluator, context API) must already be ON.
 */

const FAS2_FLAGS = [
  ['family_journey_registry_v2', 'Journey Fas 2 — DB experience registry'],
  ['family_journey_handoff_v2', 'Journey Fas 2 — Context-only handoff banner'],
  ['family_journey_parent_ack_v1', 'Journey Fas 2 — parent ack without activation program'],
  ['family_journey_onboarding_v1', 'Family Journey onboarding experiences'],
];

module.exports = {
  name: '1809310000000_enable_journey_fas2_flags',

  up: async (client) => {
    for (const [key, description] of FAS2_FLAGS) {
      await client.query(
        `INSERT INTO feature_flag (key, enabled, description)
         VALUES ($1, true, $2)
         ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
        [key, description]
      );
    }
    await client.query(
      `INSERT INTO app_config (key, value, description)
       VALUES ('JOURNEY_ROLLOUT_WAVE', '2', 'Family Journey rollout wave (1–5)')
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
    );
  },

  down: async (client) => {
    for (const [key] of FAS2_FLAGS) {
      await client.query(
        'UPDATE feature_flag SET enabled = false WHERE key = $1',
        [key]
      );
    }
    await client.query(
      `UPDATE app_config SET value = '1' WHERE key = 'JOURNEY_ROLLOUT_WAVE'`
    );
  },
};
