/**
 * Standalone admin newsletters (compose + send history).
 * Used by /api/newsletter/newsletters — separate from dagens_nyhet.
 */
module.exports = {
  name: '1795000000000_newsletters_table',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS newsletters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        created_by UUID REFERENCES parent(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMPTZ,
        sent_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_newsletters_created_at ON newsletters (created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters (status)
    `);
  },

  down: async (client) => {
    await client.query(`DROP TABLE IF EXISTS newsletters`);
  },
};
