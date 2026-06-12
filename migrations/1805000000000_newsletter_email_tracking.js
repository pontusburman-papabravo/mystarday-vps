/**
 * Per-recipient newsletter send tracking for Resend open/click webhooks.
 */
module.exports = {
  name: '1805000000000_newsletter_email_tracking',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS newsletter_email_send (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_type VARCHAR(32) NOT NULL,
        campaign_id UUID NOT NULL,
        parent_id UUID REFERENCES parent(id) ON DELETE SET NULL,
        recipient_email VARCHAR(255) NOT NULL,
        resend_email_id VARCHAR(255) UNIQUE,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        delivered_at TIMESTAMPTZ,
        first_opened_at TIMESTAMPTZ,
        open_count INTEGER NOT NULL DEFAULT 0,
        first_clicked_at TIMESTAMPTZ,
        click_count INTEGER NOT NULL DEFAULT 0,
        last_click_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_newsletter_email_send_campaign
        ON newsletter_email_send (campaign_type, campaign_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_newsletter_email_send_resend
        ON newsletter_email_send (resend_email_id)
        WHERE resend_email_id IS NOT NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS newsletter_email_send');
  },
};
