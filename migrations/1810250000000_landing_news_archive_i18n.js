/**
 * landing_news baseline + archive + English copy columns (prod may already have core table).
 */
module.exports = {
  name: '1810250000000_landing_news_archive_i18n',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS landing_news (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        body TEXT,
        image_url TEXT,
        button_text VARCHAR(50) DEFAULT 'Läs mer',
        button_url TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      ALTER TABLE landing_news
        ADD COLUMN IF NOT EXISTS title_en VARCHAR(200),
        ADD COLUMN IF NOT EXISTS body_en TEXT,
        ADD COLUMN IF NOT EXISTS button_text_en VARCHAR(50),
        ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_landing_news_active
        ON landing_news (is_active, is_archived, sort_order)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_landing_news_archived
        ON landing_news (is_archived, archived_at DESC)
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE landing_news
        DROP COLUMN IF EXISTS title_en,
        DROP COLUMN IF EXISTS body_en,
        DROP COLUMN IF EXISTS button_text_en,
        DROP COLUMN IF EXISTS is_archived,
        DROP COLUMN IF EXISTS archived_at
    `);
  },
};
