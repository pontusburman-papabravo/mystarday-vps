'use strict';

/**
 * Ensure features + family_features exist (VPS bootstrap may skip baseline-schema.sql).
 * Adds columns used by sync:features and admin Utveckling UI.
 */

module.exports = {
  name: 'ensure_features_schema',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS features (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(128) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(16) DEFAULT 'dev',
        tags TEXT[],
        priority VARCHAR(32),
        complexity INTEGER,
        estimated_hours NUMERIC(8,2),
        category VARCHAR(64),
        documentation JSONB DEFAULT '{}'::jsonb,
        dev_notes JSONB DEFAULT '[]'::jsonb,
        changelog JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS family_features (
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        feature_slug VARCHAR(128) NOT NULL,
        enabled_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (family_id, feature_slug)
      )
    `);

    const alters = [
      'ALTER TABLE features ADD COLUMN IF NOT EXISTS category VARCHAR(64)',
      'ALTER TABLE features ADD COLUMN IF NOT EXISTS documentation JSONB DEFAULT \'{}\'::jsonb',
      'ALTER TABLE features ADD COLUMN IF NOT EXISTS dev_notes JSONB DEFAULT \'[]\'::jsonb',
      'ALTER TABLE features ADD COLUMN IF NOT EXISTS changelog JSONB DEFAULT \'[]\'::jsonb',
      'ALTER TABLE features ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8,2)',
      'ALTER TABLE features ADD COLUMN IF NOT EXISTS complexity INTEGER',
      'ALTER TABLE features ADD COLUMN IF NOT EXISTS priority VARCHAR(32)',
      'ALTER TABLE features ADD COLUMN IF NOT EXISTS tags TEXT[]',
    ];
    for (const sql of alters) {
      await client.query(sql);
    }

    // Fix double-encoded JSONB from sync:features (stored as JSON string, not object)
    await client.query(`
      UPDATE features
      SET documentation = (documentation #>> '{}')::jsonb
      WHERE jsonb_typeof(documentation) = 'string'
        AND documentation #>> '{}' IS NOT NULL
    `);
    await client.query(`
      UPDATE features
      SET dev_notes = (dev_notes #>> '{}')::jsonb
      WHERE jsonb_typeof(dev_notes) = 'string'
        AND dev_notes #>> '{}' IS NOT NULL
    `);
    await client.query(`
      UPDATE features
      SET changelog = (changelog #>> '{}')::jsonb
      WHERE jsonb_typeof(changelog) = 'string'
        AND changelog #>> '{}' IS NOT NULL
    `);
  },
};
