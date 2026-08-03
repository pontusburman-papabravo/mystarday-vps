/**
 * Expand-only: store last applied RevenueCat event id/type for deterministic tie-break.
 */
module.exports = {
  name: '1810130000000_iap_event_ordering_tiebreak',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family
        ADD COLUMN IF NOT EXISTS iap_last_revenuecat_event_id TEXT,
        ADD COLUMN IF NOT EXISTS iap_last_event_type TEXT
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE family
        DROP COLUMN IF EXISTS iap_last_event_type,
        DROP COLUMN IF EXISTS iap_last_revenuecat_event_id
    `);
  },
};
