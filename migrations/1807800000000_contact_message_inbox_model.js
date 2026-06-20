/**
 * Fas 3A — contact_message status model + family_id for inbox.
 */
module.exports = {
  name: '1807800000000_contact_message_inbox_model',

  up: async (client) => {
    await client.query(`
      ALTER TABLE contact_message
        ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'new',
        ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES parent(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES family(id) ON DELETE SET NULL
    `);

    await client.query(`
      UPDATE contact_message SET status = CASE
        WHEN is_read = false THEN 'new'
        WHEN is_read = true AND (internal_note IS NULL OR TRIM(internal_note) = '') THEN 'read'
        ELSE 'in_progress'
      END
      WHERE status = 'new' AND (is_read = true OR internal_note IS NOT NULL)
    `);

    await client.query(`
      UPDATE contact_message cm SET family_id = p.family_id
      FROM parent p
      WHERE cm.family_id IS NULL
        AND cm.email IS NOT NULL
        AND LOWER(TRIM(p.email)) = LOWER(TRIM(cm.email))
        AND EXISTS (SELECT 1 FROM family f WHERE f.id = p.family_id AND f.archived_at IS NULL)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_message_status ON contact_message (status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_message_family_id ON contact_message (family_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_message_created_status
        ON contact_message (created_at DESC, status)
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_contact_message_created_status');
    await client.query('DROP INDEX IF EXISTS idx_contact_message_family_id');
    await client.query('DROP INDEX IF EXISTS idx_contact_message_status');
    await client.query(`
      ALTER TABLE contact_message
        DROP COLUMN IF EXISTS family_id,
        DROP COLUMN IF EXISTS assigned_to,
        DROP COLUMN IF EXISTS answered_at,
        DROP COLUMN IF EXISTS status
    `);
  },
};
