'use strict';

/**
 * Cache machine translations for family content (activity/reward names) sv-SE → en-GB.
 * Populated lazily on first en-GB display; static map checked first in application code.
 */
exports.up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS content_translation_cache (
      id BIGSERIAL PRIMARY KEY,
      source_locale VARCHAR(16) NOT NULL DEFAULT 'sv-SE',
      target_locale VARCHAR(16) NOT NULL DEFAULT 'en-GB',
      source_text TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT content_translation_cache_unique UNIQUE (source_locale, target_locale, source_text)
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS content_translation_cache_lookup_idx
      ON content_translation_cache (source_locale, target_locale)
  `);
};

exports.down = async (client) => {
  await client.query('DROP TABLE IF EXISTS content_translation_cache');
};
