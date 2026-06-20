/**
 * subscription_addons — legacy add-on list in admin prenumeration.
 * Referenced in db/subscription-addons.js but never migrated.
 */
module.exports = {
  name: '1807700000000_subscription_addons',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_addons (
        id              SERIAL PRIMARY KEY,
        name            VARCHAR(255) NOT NULL,
        description     TEXT,
        price_sek       INTEGER NOT NULL DEFAULT 0,
        stripe_price_id VARCHAR(255),
        is_active       BOOLEAN NOT NULL DEFAULT true,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS subscription_addons');
  },
};
