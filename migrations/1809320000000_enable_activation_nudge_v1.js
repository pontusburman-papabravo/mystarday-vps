'use strict';

/**
 * Enable ACT-1 PR 5 — non-activated nudge email (24–48h after signup).
 */

module.exports = {
  name: '1809320000000_enable_activation_nudge_v1',

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, $2)
       ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
      ['activation_nudge_v1', 'ACT-1 PR5 — email nudge 24–48h om ej P0 aktiverad']
    );
  },

  down: async (client) => {
    await client.query(
      'UPDATE feature_flag SET enabled = false WHERE key = $1',
      ['activation_nudge_v1']
    );
  },
};
