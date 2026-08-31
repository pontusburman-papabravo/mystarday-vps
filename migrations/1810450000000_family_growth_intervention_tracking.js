'use strict';

/**
 * Store what was sent + Resend id so admin can show copy, delivery, and opens.
 * Open/delivered events reuse newsletter_email_send via resend_email_id.
 */

module.exports = {
  name: '1810450000000_family_growth_intervention_tracking',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family_growth_intervention
        ADD COLUMN IF NOT EXISTS provider_email_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS body_html_snapshot TEXT
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_growth_intervention_provider_email
        ON family_growth_intervention (provider_email_id)
        WHERE provider_email_id IS NOT NULL
    `);
  },

  down: async (client) => {
    await client.query(`
      DROP INDEX IF EXISTS idx_family_growth_intervention_provider_email
    `);
    await client.query(`
      ALTER TABLE family_growth_intervention
        DROP COLUMN IF EXISTS provider_email_id,
        DROP COLUMN IF EXISTS recipient_email,
        DROP COLUMN IF EXISTS body_html_snapshot
    `);
  },
};
