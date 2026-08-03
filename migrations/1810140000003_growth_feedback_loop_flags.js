'use strict';

/**
 * Growth feedback loop feature flags — default OFF for safe rollout.
 * referral_program already exists (default OFF); not re-inserted here.
 */

const FLAGS = [
  ['growth_feedback_v1', 'Journey-gated short feedback prompts after value / stuck states'],
  ['growth_referral_cta_v1', 'Show personal referral CTA only after First Success / positive usage'],
  ['growth_stuck_cohorts_v1', 'Admin stuck-family cohort segments with recommended follow-up preview'],
  ['growth_waitlist_funnel_v1', 'English waitlist funnel attribution + conversion linkage'],
];

module.exports = {
  name: '1810140000003_growth_feedback_loop_flags',

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
