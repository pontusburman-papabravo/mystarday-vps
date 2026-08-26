'use strict';

/**
 * Delivery hardening for manual stuck interventions:
 * pending claim → sent | failed | unknown (no open txn during email send).
 */

module.exports = {
  name: '1810420000001_family_growth_intervention_delivery',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family_growth_intervention
        ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS delivery_error TEXT,
        ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(256)
    `);

    await client.query(`
      ALTER TABLE family_growth_intervention
        DROP CONSTRAINT IF EXISTS family_growth_intervention_status_chk
    `);
    await client.query(`
      ALTER TABLE family_growth_intervention
        ADD CONSTRAINT family_growth_intervention_status_chk CHECK (
          status IN ('pending', 'sent', 'skipped', 'failed', 'unknown')
        )
    `);

    await client.query(`
      DROP INDEX IF EXISTS idx_family_growth_intervention_sent_once
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_family_growth_intervention_active_delivery
        ON family_growth_intervention (family_id, intervention_key)
        WHERE status IN ('sent', 'pending')
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_growth_intervention_pending_claimed
        ON family_growth_intervention (claimed_at)
        WHERE status = 'pending'
    `);
  },

  down: async (client) => {
    await client.query(`
      DROP INDEX IF EXISTS idx_family_growth_intervention_pending_claimed
    `);
    await client.query(`
      DROP INDEX IF EXISTS idx_family_growth_intervention_active_delivery
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_family_growth_intervention_sent_once
        ON family_growth_intervention (family_id, intervention_key)
        WHERE status = 'sent'
    `);

    await client.query(`
      DELETE FROM family_growth_intervention
      WHERE status IN ('pending', 'failed', 'unknown')
    `);

    await client.query(`
      ALTER TABLE family_growth_intervention
        DROP CONSTRAINT IF EXISTS family_growth_intervention_status_chk
    `);
    await client.query(`
      ALTER TABLE family_growth_intervention
        ADD CONSTRAINT family_growth_intervention_status_chk CHECK (
          status IN ('sent', 'skipped')
        )
    `);

    await client.query(`
      ALTER TABLE family_growth_intervention
        DROP COLUMN IF EXISTS claimed_at,
        DROP COLUMN IF EXISTS delivery_error,
        DROP COLUMN IF EXISTS idempotency_key
    `);
  },
};
