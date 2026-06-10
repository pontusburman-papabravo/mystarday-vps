'use strict';

/**
 * VPS / harvest DB drift: dagens_nyhet missing columns used by nyhet-scheduler
 * and admin UI; library_update_log never migrated from Polsia-era schema.
 */

module.exports = {
  name: '1799800000000_dagens_nyhet_columns_and_library_update_log',

  up: async (client) => {
    const dagensNyhetAlters = [
      'ALTER TABLE dagens_nyhet ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ',
      'ALTER TABLE dagens_nyhet ADD COLUMN IF NOT EXISTS post_to_facebook BOOLEAN DEFAULT false',
      'ALTER TABLE dagens_nyhet ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES parent(id) ON DELETE SET NULL',
      'ALTER TABLE dagens_nyhet ADD COLUMN IF NOT EXISTS facebook_post_id VARCHAR(255)',
      'ALTER TABLE dagens_nyhet ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ',
      'ALTER TABLE dagens_nyhet ADD COLUMN IF NOT EXISTS email_sent_count INTEGER DEFAULT 0',
      'ALTER TABLE dagens_nyhet ADD COLUMN IF NOT EXISTS email_failed_count INTEGER DEFAULT 0',
      'ALTER TABLE dagens_nyhet ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ',
      'ALTER TABLE dagens_nyhet ADD COLUMN IF NOT EXISTS email_failed BOOLEAN DEFAULT false',
    ];
    for (const sql of dagensNyhetAlters) {
      await client.query(sql);
    }

    await client.query(`
      UPDATE dagens_nyhet
      SET published_at = COALESCE(publish_at, created_at, NOW())
      WHERE status = 'published' AND published_at IS NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS library_update_log (
        id SERIAL PRIMARY KEY,
        kind VARCHAR(32) NOT NULL,
        change_count INTEGER NOT NULL DEFAULT 1,
        sample_description TEXT,
        flush_after TIMESTAMPTZ NOT NULL,
        sent_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS library_update_log_pending_kind_idx
        ON library_update_log (kind) WHERE sent_at IS NULL
    `);
  },
};
