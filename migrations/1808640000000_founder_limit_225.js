'use strict';

/**
 * Raise founder program cap from 200 → 225 families (lifetime free Basic).
 */
module.exports = {
  name: '1808640000000_founder_limit_225',

  up: async (client) => {
    await client.query(`
      INSERT INTO app_settings (key, value)
      VALUES ('founder_family_limit', '225'::jsonb)
      ON CONFLICT (key) DO UPDATE
        SET value = '225'::jsonb, updated_at = NOW()
    `);
  },
};
