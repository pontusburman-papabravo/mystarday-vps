'use strict';

/**
 * Remove founder program cap — unlimited lifetime free Basic until admin sets a limit.
 * Backfill: all existing non-archived families that missed the 225 cap (including smoke/test).
 */
module.exports = {
  name: '1809620000000_founder_limit_unlimited',

  up: async (client) => {
    await client.query(`
      UPDATE app_settings
      SET value = 'null'::jsonb, updated_at = NOW()
      WHERE key = 'founder_family_limit'
    `);

    await client.query(`
      UPDATE family
      SET is_lifetime_free = true
      WHERE is_lifetime_free = false
        AND archived_at IS NULL
    `);

    // Settings UI reads family_subscriptions.tier — align with is_lifetime_free for backfilled families.
    await client.query(`
      UPDATE family_subscriptions fs
      SET tier = 'lifetime_free',
          trial_expires_at = NULL,
          updated_at = NOW()
      FROM family f
      WHERE fs.family_id = f.id
        AND f.is_lifetime_free = true
        AND fs.tier = 'trial'
    `);
  },

  down: async (client) => {
    await client.query(`
      UPDATE app_settings
      SET value = '225'::jsonb, updated_at = NOW()
      WHERE key = 'founder_family_limit'
    `);
  },
};
