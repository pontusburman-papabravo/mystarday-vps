'use strict';

/**
 * Pilot-safe För dig follow-up send + dismissible Hem banner.
 * - Banner dismiss is per parent + pending item (not email opt-out).
 * - Recipient send_status enables atomic claim / partial retry.
 */

module.exports = {
  name: '1810520000000_for_dig_outcome_followup_pilot_safety',
  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: true,
  },
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS for_dig_outcome_banner_dismiss (
        parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        goal_slug VARCHAR(64) NOT NULL,
        dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (parent_id, family_id, child_id, goal_slug)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_for_dig_outcome_banner_dismiss_parent
        ON for_dig_outcome_banner_dismiss (parent_id)
    `);

    await client.query(`
      ALTER TABLE for_dig_outcome_followup_recipient
        ADD COLUMN IF NOT EXISTS send_status VARCHAR(32) NOT NULL DEFAULT 'prepared',
        ADD COLUMN IF NOT EXISTS send_claimed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS send_error TEXT
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_for_dig_followup_recipient_send_status
        ON for_dig_outcome_followup_recipient (batch_id, send_status)
    `);
  },

  down: async (client) => {
    await client.query(`
      DROP INDEX IF EXISTS idx_for_dig_followup_recipient_send_status
    `);
    await client.query(`
      ALTER TABLE for_dig_outcome_followup_recipient
        DROP COLUMN IF EXISTS send_status,
        DROP COLUMN IF EXISTS send_claimed_at,
        DROP COLUMN IF EXISTS send_error
    `);
    await client.query('DROP TABLE IF EXISTS for_dig_outcome_banner_dismiss');
  },
};
