'use strict';

/**
 * Seeds founder limit + default pricing in app_settings.
 * Model A: first N families = lifetime free; family N+1 = subscription.
 */
module.exports = {
  name: '1806000000000_payment_policy_settings',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      INSERT INTO app_settings (key, value)
      VALUES
        ('founder_family_limit', '200'::jsonb),
        ('basic_price_sek', '59'::jsonb),
        ('basic_trial_days', '14'::jsonb),
        ('payment_enabled', 'false'::jsonb)
      ON CONFLICT (key) DO NOTHING
    `);
  },
};
