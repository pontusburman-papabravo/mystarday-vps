/**
 * IAP webhook ordering + audit columns on family and iap_webhook_log.
 */
module.exports = {
  name: '1810000000016_iap_event_ordering_audit',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family
        ADD COLUMN IF NOT EXISTS iap_last_event_timestamp_ms BIGINT,
        ADD COLUMN IF NOT EXISTS iap_last_applied_environment TEXT,
        ADD COLUMN IF NOT EXISTS iap_last_applied_product_id TEXT
    `);
    await client.query(`
      ALTER TABLE iap_webhook_log
        ADD COLUMN IF NOT EXISTS event_timestamp_ms BIGINT,
        ADD COLUMN IF NOT EXISTS environment TEXT
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE iap_webhook_log
        DROP COLUMN IF EXISTS environment,
        DROP COLUMN IF EXISTS event_timestamp_ms
    `);
    await client.query(`
      ALTER TABLE family
        DROP COLUMN IF EXISTS iap_last_applied_product_id,
        DROP COLUMN IF EXISTS iap_last_applied_environment,
        DROP COLUMN IF EXISTS iap_last_event_timestamp_ms
    `);
  },
};
