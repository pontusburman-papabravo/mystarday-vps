'use strict';

/**
 * Manual stuck-family growth interventions — canonical send/skip history.
 * V1: admin preview/send only. No scheduler reads this table.
 */

const GROWTH_INTERVENTION_STATUSES = Object.freeze({
  sent: 'sent',
  skipped: 'skipped',
});

module.exports = {
  name: '1810420000000_family_growth_intervention',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_growth_intervention (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        cohort VARCHAR(64) NOT NULL,
        intervention_key VARCHAR(64) NOT NULL,
        channel VARCHAR(16) NOT NULL DEFAULT 'email',
        status VARCHAR(16) NOT NULL,
        sent_at TIMESTAMPTZ,
        sent_by UUID REFERENCES parent(id) ON DELETE SET NULL,
        skipped_at TIMESTAMPTZ,
        skip_reason TEXT,
        subject_snapshot TEXT NOT NULL,
        body_version VARCHAR(32) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT family_growth_intervention_status_chk CHECK (
          status IN ('sent', 'skipped')
        ),
        CONSTRAINT family_growth_intervention_channel_chk CHECK (
          channel IN ('email')
        )
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_family_growth_intervention_sent_once
        ON family_growth_intervention (family_id, intervention_key)
        WHERE status = 'sent'
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_growth_intervention_family_created
        ON family_growth_intervention (family_id, created_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS family_growth_intervention');
  },
};
