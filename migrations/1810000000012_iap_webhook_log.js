/**
 * Durable idempotency log for RevenueCat webhook events.
 */
module.exports = {
  name: '1810000000012_iap_webhook_log',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS iap_webhook_log (
        revenuecat_event_id TEXT PRIMARY KEY,
        event_type          VARCHAR(64) NOT NULL,
        family_id           UUID REFERENCES family(id) ON DELETE SET NULL,
        processed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_iap_webhook_log_family_id
      ON iap_webhook_log (family_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_iap_webhook_log_processed_at
      ON iap_webhook_log (processed_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS iap_webhook_log');
  },
};
