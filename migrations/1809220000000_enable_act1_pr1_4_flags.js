'use strict';

/**
 * ACT-1 PR 1–4 — enable feature flags for all families.
 * PR 5 (nudges), referral, and first_star_mode stay OFF until separate go-live.
 */

const { ACT1_PR14_FLAG_KEYS } = require('../src/lib/activation-flags');

const DESCRIPTIONS = {
  activation_onboarding_v1: 'ACT-1 template-first onboarding UI',
  activation_child_handoff_v1: 'ACT-1 child access handoff step',
  activation_first_star_guide_v1: 'ACT-1 guided first star',
  activation_ai_starter_plan: 'ACT-1 AI personalization on starter plan',
};

module.exports = {
  name: '1809220000000_enable_act1_pr1_4_flags',

  up: async (client) => {
    for (const key of ACT1_PR14_FLAG_KEYS) {
      await client.query(
        `INSERT INTO feature_flag (key, enabled, description)
         VALUES ($1, true, $2)
         ON CONFLICT (key) DO UPDATE SET enabled = true`,
        [key, DESCRIPTIONS[key] || key]
      );
    }
  },

  down: async (client) => {
    await client.query(
      `UPDATE feature_flag
       SET enabled = false
       WHERE key = ANY($1::text[])`,
      [ACT1_PR14_FLAG_KEYS]
    );
  },
};
