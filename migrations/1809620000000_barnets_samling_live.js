'use strict';

/**
 * Barnets samling — go live for all families.
 * Product sign-off 2026-07-14 after constitution QA + bugfixes (avatar, NNL, star placement).
 */

module.exports = {
  name: '1809620000000_barnets_samling_live',

  up: async (client) => {
    await client.query(`
      UPDATE features SET status = 'live', updated_at = NOW()
      WHERE slug = 'barnets_samling'
    `);
  },

  down: async (client) => {
    await client.query(`
      UPDATE features SET status = 'dev', updated_at = NOW()
      WHERE slug = 'barnets_samling'
    `);
  },
};
