'use strict';

/**
 * Batch-anchor tables for För dig outcome follow-up emails.
 * Per-recipient open/click tracking stays on newsletter_email_send
 * (campaign_type = 'for_dig_outcome_followup', campaign_id = batch.id).
 */

module.exports = {
  name: '1810500000000_for_dig_outcome_followup_email',
  snapshotContract: {
    backwardCompatible: true,
  },
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS for_dig_outcome_followup_batch (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS for_dig_outcome_followup_recipient (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_id UUID NOT NULL REFERENCES for_dig_outcome_followup_batch(id) ON DELETE CASCADE,
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        goal_slug VARCHAR(64) NOT NULL,
        parent_id UUID REFERENCES parent(id) ON DELETE SET NULL,
        recipient_email VARCHAR(255) NOT NULL,
        newsletter_email_send_id UUID REFERENCES newsletter_email_send(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (batch_id, family_id, child_id, goal_slug)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_for_dig_outcome_followup_recipient_batch
        ON for_dig_outcome_followup_recipient (batch_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_for_dig_outcome_followup_recipient_match
        ON for_dig_outcome_followup_recipient (family_id, child_id, goal_slug)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS for_dig_outcome_followup_recipient');
    await client.query('DROP TABLE IF EXISTS for_dig_outcome_followup_batch');
  },
};
