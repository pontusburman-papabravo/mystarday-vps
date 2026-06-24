'use strict';

/**
 * ACT-1 feature flags — default OFF for safe rollout.
 */

const FLAGS = [
  ['activation_onboarding_v1', 'ACT-1 template-first onboarding UI'],
  ['activation_child_handoff_v1', 'ACT-1 child access handoff step'],
  ['activation_first_star_guide_v1', 'ACT-1 guided first star'],
  ['activation_ai_starter_plan', 'ACT-1 AI personalization on starter plan'],
  ['custody_schedule_beta', 'FEAT-1 boendeschema (växelvis boende)'],
  ['print_scan_beta', 'FEAT-6 skannbart utskriftsschema (Basic)'],
  ['referral_program', 'Referral v0 tracking'],
];

module.exports = {
  name: '1808610000000_activation_onboarding_flags',

  up: async (client) => {
    for (const [key, description] of FLAGS) {
      await client.query(
        `INSERT INTO feature_flag (key, enabled, description)
         VALUES ($1, false, $2)
         ON CONFLICT (key) DO NOTHING`,
        [key, description]
      );
    }
  },

  down: async (client) => {
    const keys = FLAGS.map(([k]) => k);
    await client.query('DELETE FROM feature_flag WHERE key = ANY($1::text[])', [keys]);
  },
};
