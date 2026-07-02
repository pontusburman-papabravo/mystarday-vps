'use strict';

/**
 * FEAT-1C — custody_override: dated exceptions on top of custody_pattern.
 */

module.exports = {
  name: '1809330000000_custody_override',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS custody_override (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        home_id UUID NOT NULL REFERENCES custody_home(id) ON DELETE RESTRICT,
        reason TEXT,
        priority SMALLINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (start_date <= end_date)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_custody_override_child_dates
        ON custody_override (child_id, start_date, end_date)
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_custody_override_child_dates');
    await client.query('DROP TABLE IF EXISTS custody_override');
  },
};
