/**
 * Lightweight log of Resend webhook events — used for admin diagnostics
 * (distinguish "tracking disabled in Resend" vs "events not matching sends").
 */
module.exports = {
  name: '1808730000000_resend_webhook_event_log',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS resend_webhook_event (
        id BIGSERIAL PRIMARY KEY,
        event_type VARCHAR(64) NOT NULL,
        email_id VARCHAR(255),
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_resend_webhook_event_received
        ON resend_webhook_event (received_at)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_resend_webhook_event_type_received
        ON resend_webhook_event (event_type, received_at)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS resend_webhook_event');
  },
};
