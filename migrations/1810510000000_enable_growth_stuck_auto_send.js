'use strict';

/**
 * Enable automatic founder stuck-family intervention emails (hourly scheduler).
 * Product nudge (activation_nudge_v1) still fires at 24–48h; founder mail follows
 * existing 72h growth-email cooldown via growth-stuck-intervention eligibility.
 */

module.exports = {
  name: '1810510000000_enable_growth_stuck_auto_send',

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, $2)
       ON CONFLICT (key) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         description = EXCLUDED.description`,
      [
        'growth_stuck_cohorts_v1',
        'Stuck-family founder auto-send (48h–14d, hourly scheduler; admin list always readable)',
      ]
    );
  },

  down: async (client) => {
    await client.query(
      'UPDATE feature_flag SET enabled = false WHERE key = $1',
      ['growth_stuck_cohorts_v1']
    );
  },
};
