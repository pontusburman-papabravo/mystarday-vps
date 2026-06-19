/**
 * Pedagogläge v1.2 — tables, note_status, daily_log completion (§4.4, E12).
 */
module.exports = {
  name: '1807000000000_pedagog_v12',

  up: async (client) => {
    await client.query(`
      ALTER TABLE pedagog_notes
        ADD COLUMN IF NOT EXISTS note_status VARCHAR(32) DEFAULT 'draft',
        ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ
    `);

    await client.query(`
      UPDATE pedagog_notes
      SET note_status = CASE WHEN is_draft = false THEN 'published' ELSE 'draft' END
      WHERE note_status IS NULL OR note_status = 'draft'
    `);

    await client.query(`
      ALTER TABLE daily_log_item
        ADD COLUMN IF NOT EXISTS completed_by VARCHAR(32),
        ADD COLUMN IF NOT EXISTS completed_by_parent_id UUID REFERENCES parent(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS completion_source VARCHAR(32),
        ADD COLUMN IF NOT EXISTS completion_comment TEXT
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pedagog_day_comment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (child_id, parent_id, date)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pedagog_day_absence (
        child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        reported_by UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (child_id, date)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pedagog_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        child_id UUID REFERENCES child(id) ON DELETE SET NULL,
        pedagog_id UUID REFERENCES parent(id) ON DELETE SET NULL,
        parent_id UUID REFERENCES parent(id) ON DELETE SET NULL,
        action VARCHAR(64) NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pedagog_audit_family
      ON pedagog_audit_log (family_id, created_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pedagog_school_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(16),
        created_by UUID REFERENCES parent(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS pedagog_school_activity');
    await client.query('DROP TABLE IF EXISTS pedagog_audit_log');
    await client.query('DROP TABLE IF EXISTS pedagog_day_absence');
    await client.query('DROP TABLE IF EXISTS pedagog_day_comment');
    await client.query(`
      ALTER TABLE daily_log_item
        DROP COLUMN IF EXISTS completion_comment,
        DROP COLUMN IF EXISTS completion_source,
        DROP COLUMN IF EXISTS completed_by_parent_id,
        DROP COLUMN IF EXISTS completed_by
    `);
    await client.query(`
      ALTER TABLE pedagog_notes
        DROP COLUMN IF EXISTS published_at,
        DROP COLUMN IF EXISTS note_status
    `);
  },
};
