'use strict';

/**
 * Family country + market_region for jurisdiction (P-i18n market model).
 * market_region is derived at write time; country_code is user-selected at registration.
 */

const MARKET_REGIONS = ['EU', 'UK', 'US', 'OTHER'];
const regionList = MARKET_REGIONS.map((r) => `'${r}'`).join(', ');

module.exports = {
  name: '1810000000007_family_market_country',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family
        ADD COLUMN IF NOT EXISTS country_code CHAR(2) NOT NULL DEFAULT 'SE',
        ADD COLUMN IF NOT EXISTS market_region VARCHAR(8) NOT NULL DEFAULT 'EU',
        ADD COLUMN IF NOT EXISTS country_selected_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS country_selection_source VARCHAR(32)
    `);

    await client.query(`
      UPDATE family
      SET country_code = COALESCE(country_code, 'SE'),
          market_region = COALESCE(market_region, 'EU'),
          country_selected_at = COALESCE(country_selected_at, created_at),
          country_selection_source = COALESCE(country_selection_source, 'legacy_default')
      WHERE country_selected_at IS NULL OR country_selection_source IS NULL
    `);

    await client.query(`
      ALTER TABLE family DROP CONSTRAINT IF EXISTS family_market_region_check
    `);
    await client.query(`
      ALTER TABLE family
        ADD CONSTRAINT family_market_region_check
        CHECK (market_region IN (${regionList}))
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_market_region ON family (market_region)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_country_code ON family (country_code)
    `);

    await client.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES
        ('market_uk_open', false, 'Allow new family registration from United Kingdom'),
        ('market_us_open', false, 'Allow new family registration from United States')
      ON CONFLICT (key) DO NOTHING
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_family_country_code');
    await client.query('DROP INDEX IF EXISTS idx_family_market_region');
    await client.query('ALTER TABLE family DROP CONSTRAINT IF EXISTS family_market_region_check');
    await client.query(`
      ALTER TABLE family
        DROP COLUMN IF EXISTS country_selection_source,
        DROP COLUMN IF EXISTS country_selected_at,
        DROP COLUMN IF EXISTS market_region,
        DROP COLUMN IF EXISTS country_code
    `);
    await client.query(`
      DELETE FROM feature_flag WHERE key IN ('market_uk_open', 'market_us_open')
    `);
  },
};
