'use strict';

/**
 * Support ops — resolution metadata, archive timestamps, immutable event log.
 */
module.exports = {
  name: '1810000000011_contact_message_support_ops',

  up: async (client) => {
    await client.query(`
      ALTER TABLE contact_message
        ADD COLUMN IF NOT EXISTS root_cause VARCHAR(64),
        ADD COLUMN IF NOT EXISTS resolution_type VARCHAR(64),
        ADD COLUMN IF NOT EXISTS resolution_summary TEXT,
        ADD COLUMN IF NOT EXISTS fix_reference VARCHAR(255),
        ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES parent(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES parent(id) ON DELETE SET NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_message_event (
        id BIGSERIAL PRIMARY KEY,
        contact_message_id INTEGER NOT NULL REFERENCES contact_message(id) ON DELETE CASCADE,
        event_type VARCHAR(64) NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        admin_id UUID REFERENCES parent(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_message_root_cause
        ON contact_message (root_cause)
        WHERE root_cause IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_message_resolution_type
        ON contact_message (resolution_type)
        WHERE resolution_type IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_message_archived_at
        ON contact_message (archived_at DESC)
        WHERE archived_at IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_message_event_message_created
        ON contact_message_event (contact_message_id, created_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_contact_message_event_message_created');
    await client.query('DROP INDEX IF EXISTS idx_contact_message_archived_at');
    await client.query('DROP INDEX IF EXISTS idx_contact_message_resolution_type');
    await client.query('DROP INDEX IF EXISTS idx_contact_message_root_cause');
    await client.query('DROP TABLE IF EXISTS contact_message_event');
    await client.query(`
      ALTER TABLE contact_message
        DROP COLUMN IF EXISTS archived_by,
        DROP COLUMN IF EXISTS archived_at,
        DROP COLUMN IF EXISTS resolved_by,
        DROP COLUMN IF EXISTS resolved_at,
        DROP COLUMN IF EXISTS fix_reference,
        DROP COLUMN IF EXISTS resolution_summary,
        DROP COLUMN IF EXISTS resolution_type,
        DROP COLUMN IF EXISTS root_cause
    `);
  },
};
