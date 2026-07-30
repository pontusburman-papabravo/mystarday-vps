/**
 * Audit columns on iap_webhook_log for orphan follow-up and ops reconciliation.
 */
module.exports = {
  name: '1810000000015_iap_webhook_log_audit_fields',

  up: async (client) => {
    await client.query(`
      ALTER TABLE iap_webhook_log
        ADD COLUMN IF NOT EXISTS app_user_id TEXT,
        ADD COLUMN IF NOT EXISTS original_app_user_id TEXT,
        ADD COLUMN IF NOT EXISTS product_id TEXT,
        ADD COLUMN IF NOT EXISTS expiration_at_ms BIGINT,
        ADD COLUMN IF NOT EXISTS skip_reason VARCHAR(64),
        ADD COLUMN IF NOT EXISTS processing_outcome VARCHAR(32)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_iap_webhook_log_skip_reason
      ON iap_webhook_log (skip_reason)
      WHERE skip_reason IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_iap_webhook_log_app_user_id
      ON iap_webhook_log (app_user_id)
      WHERE app_user_id IS NOT NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_iap_webhook_log_app_user_id');
    await client.query('DROP INDEX IF EXISTS idx_iap_webhook_log_skip_reason');
    await client.query(`
      ALTER TABLE iap_webhook_log
        DROP COLUMN IF EXISTS processing_outcome,
        DROP COLUMN IF EXISTS skip_reason,
        DROP COLUMN IF EXISTS expiration_at_ms,
        DROP COLUMN IF EXISTS product_id,
        DROP COLUMN IF EXISTS original_app_user_id,
        DROP COLUMN IF EXISTS app_user_id
    `);
  },
};
