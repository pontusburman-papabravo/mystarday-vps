'use strict';

/**
 * PAYMENTS V1 Phase D — gift card orders, codes, redemption audit.
 */
module.exports = {
  name: '1810410000000_payments_v1_gift_cards',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS gift_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        public_id TEXT NOT NULL UNIQUE,
        status_token_hash TEXT NOT NULL UNIQUE,
        purchaser_email TEXT NOT NULL,
        purchaser_name TEXT,
        company_name TEXT,
        company_org_number TEXT,
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 99),
        unit_price_minor INTEGER NOT NULL,
        total_amount_minor INTEGER NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'SEK',
        payment_provider TEXT,
        payment_intent_id TEXT,
        payment_status TEXT NOT NULL DEFAULT 'pending',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gift_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES gift_orders(id) ON DELETE CASCADE,
        code_hash TEXT NOT NULL UNIQUE,
        code_fingerprint TEXT NOT NULL,
        design_key TEXT NOT NULL DEFAULT 'neutral',
        recipient_name TEXT,
        recipient_email TEXT,
        personal_message TEXT,
        premium_months INTEGER NOT NULL DEFAULT 12,
        scheduled_delivery_at TIMESTAMPTZ NOT NULL,
        original_scheduled_delivery_at TIMESTAMPTZ NOT NULL,
        delivered_at TIMESTAMPTZ,
        redemption_expires_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'purchased',
        redeemed_at TIMESTAMPTZ,
        redeemed_family_id UUID REFERENCES family(id) ON DELETE SET NULL,
        replaced_by_card_id UUID REFERENCES gift_cards(id) ON DELETE SET NULL,
        blocked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gift_redemption_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code_fingerprint TEXT,
        family_id UUID REFERENCES family(id) ON DELETE SET NULL,
        ip_address TEXT,
        success BOOLEAN NOT NULL DEFAULT false,
        failure_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gift_cards_order ON gift_cards (order_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards (status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gift_cards_fingerprint ON gift_cards (code_fingerprint)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gift_redemption_attempts_ip
        ON gift_redemption_attempts (ip_address, created_at DESC)
    `);

    const giftDefaults = {
      gift_cards_enabled: true,
      gift_cards_sales_enabled: true,
      gift_price_sek: 590,
      gift_premium_months: 12,
      gift_redemption_validity_months: 12,
      gift_max_schedule_months: 6,
      gift_delivery_postpone_days: 7,
      gift_online_checkout_max: 99,
      gift_discount_contact_threshold: 25,
      gift_invoice_threshold: 100,
    };

    for (const [key, value] of Object.entries(giftDefaults)) {
      await client.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO NOTHING`,
        [key, JSON.stringify(value)]
      );
    }
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS gift_redemption_attempts');
    await client.query('DROP TABLE IF EXISTS gift_cards');
    await client.query('DROP TABLE IF EXISTS gift_orders');
    const keys = [
      'gift_cards_enabled',
      'gift_cards_sales_enabled',
      'gift_price_sek',
      'gift_premium_months',
      'gift_redemption_validity_months',
      'gift_max_schedule_months',
      'gift_delivery_postpone_days',
      'gift_online_checkout_max',
      'gift_discount_contact_threshold',
      'gift_invoice_threshold',
    ];
    for (const key of keys) {
      await client.query('DELETE FROM app_settings WHERE key = $1', [key]);
    }
  },
};
