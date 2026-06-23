'use strict';

/**
 * Drop legacy Stripe linkage columns from family (Fas 6 A5c).
 * No active code reads these since Fas 5 Stripe removal.
 */

module.exports = {
  name: '1808300000000_drop_family_stripe_columns',

  up: async (client) => {
    await client.query('ALTER TABLE family DROP COLUMN IF EXISTS stripe_customer_id');
    await client.query('ALTER TABLE family DROP COLUMN IF EXISTS stripe_subscription_id');
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE family
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)
    `);
    await client.query(`
      ALTER TABLE family
      ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)
    `);
  },
};
