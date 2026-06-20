/**
 * Fas 3C — lead_status + owner/notes on growth tables.
 */
const LEAD_TABLES = ['package_interest', 'professional_interest', 'waitlist'];

module.exports = {
  name: '1807900000000_lead_pipeline_fields',

  up: async (client) => {
    for (const table of LEAD_TABLES) {
      await client.query(`
        ALTER TABLE ${table}
          ADD COLUMN IF NOT EXISTS lead_status VARCHAR(32) NOT NULL DEFAULT 'ny',
          ADD COLUMN IF NOT EXISTS owner VARCHAR(255),
          ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS lead_notes TEXT,
          ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${table}_lead_status ON ${table} (lead_status)
      `);
    }
  },

  down: async (client) => {
    for (const table of LEAD_TABLES) {
      await client.query(`DROP INDEX IF EXISTS idx_${table}_lead_status`);
      await client.query(`
        ALTER TABLE ${table}
          DROP COLUMN IF EXISTS converted_at,
          DROP COLUMN IF EXISTS lead_notes,
          DROP COLUMN IF EXISTS last_contacted_at,
          DROP COLUMN IF EXISTS owner,
          DROP COLUMN IF EXISTS lead_status
      `);
    }
  },
};
