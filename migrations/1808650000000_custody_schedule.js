'use strict';

/**
 * FEAT-1 — Boendeschema: homes, parent mapping, per-child A/B pattern.
 */

module.exports = {
  name: '1808650000000_custody_schedule',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS custody_home (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        label VARCHAR(64) NOT NULL,
        color VARCHAR(7) NOT NULL DEFAULT '#4F46E5',
        sort_order SMALLINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_custody_home_family
        ON custody_home (family_id, sort_order)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS custody_parent_home (
        parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        custody_home_id UUID NOT NULL REFERENCES custody_home(id) ON DELETE CASCADE,
        PRIMARY KEY (parent_id, custody_home_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS custody_pattern (
        child_id UUID PRIMARY KEY REFERENCES child(id) ON DELETE CASCADE,
        anchor_date DATE NOT NULL,
        interval_weeks SMALLINT NOT NULL DEFAULT 2 CHECK (interval_weeks >= 2),
        week_a_home_id UUID NOT NULL REFERENCES custody_home(id) ON DELETE RESTRICT,
        week_b_home_id UUID NOT NULL REFERENCES custody_home(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      ALTER TABLE weekly_schedule
        ADD COLUMN IF NOT EXISTS week_variant CHAR(1)
          CHECK (week_variant IS NULL OR week_variant IN ('a', 'b'))
    `);
    await client.query(`
      ALTER TABLE weekly_schedule
        ADD COLUMN IF NOT EXISTS custody_home_id UUID
          REFERENCES custody_home(id) ON DELETE SET NULL
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_schedule_child_dow_variant
        ON weekly_schedule (child_id, day_of_week, COALESCE(week_variant, 'legacy'))
        WHERE child_id IS NOT NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_weekly_schedule_child_dow_variant');
    await client.query(`
      ALTER TABLE weekly_schedule
        DROP COLUMN IF EXISTS custody_home_id,
        DROP COLUMN IF EXISTS week_variant
    `);
    await client.query('DROP TABLE IF EXISTS custody_pattern');
    await client.query('DROP TABLE IF EXISTS custody_parent_home');
    await client.query('DROP TABLE IF EXISTS custody_home');
  },
};
