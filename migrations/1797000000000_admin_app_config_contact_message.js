/**
 * Admin platform tables missing from early baseline-schema:
 * - app_config (library toggle apply_default_schema, etc.)
 * - contact_message admin columns (is_read, internal_note, …)
 */
module.exports = {
  name: '1797000000000_admin_app_config_contact_message',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        updated_by UUID REFERENCES parent(id) ON DELETE SET NULL
      )
    `);

    await client.query(`
      INSERT INTO app_config (key, value, description)
      VALUES (
        'apply_default_schema',
        'true',
        'Applicera standardschema på nya barn automatiskt vid registrering'
      )
      ON CONFLICT (key) DO NOTHING
    `);

    await client.query(`
      ALTER TABLE contact_message
      ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false
    `);
    await client.query(`
      ALTER TABLE contact_message
      ADD COLUMN IF NOT EXISTS internal_note TEXT
    `);
    await client.query(`
      ALTER TABLE contact_message
      ADD COLUMN IF NOT EXISTS noted_at TIMESTAMPTZ
    `);
    await client.query(`
      ALTER TABLE contact_message
      ADD COLUMN IF NOT EXISTS noted_by UUID REFERENCES parent(id) ON DELETE SET NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS app_config');
    await client.query('ALTER TABLE contact_message DROP COLUMN IF EXISTS noted_by');
    await client.query('ALTER TABLE contact_message DROP COLUMN IF EXISTS noted_at');
    await client.query('ALTER TABLE contact_message DROP COLUMN IF EXISTS internal_note');
    await client.query('ALTER TABLE contact_message DROP COLUMN IF EXISTS is_read');
  },
};
