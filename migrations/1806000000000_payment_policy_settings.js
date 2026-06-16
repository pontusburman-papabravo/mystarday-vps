/**
 * Seeds founder limit + default pricing in app_settings.
 * Model A: first N families = lifetime free; family N+1 = subscription.
 */

exports.up = async (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(255) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    INSERT INTO app_settings (key, value)
    VALUES
      ('founder_family_limit', '200'::jsonb),
      ('basic_price_sek', '59'::jsonb),
      ('basic_trial_days', '14'::jsonb),
      ('payment_enabled', 'false'::jsonb)
    ON CONFLICT (key) DO NOTHING;
  `);
};

exports.down = async (pgm) => {
  pgm.sql(`DELETE FROM app_settings WHERE key = 'founder_family_limit';`);
};
