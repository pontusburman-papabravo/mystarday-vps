'use strict';

/**
 * PAYMENTS V1 Phase A — canonical family_entitlements + payment_audit_log + payment_start_at seed.
 */
const DEFAULT_PAYMENT_START_AT = '2026-10-01T00:00:00+02:00';

module.exports = {
  name: '1810400000000_payments_v1_entitlements',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_entitlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        entitlement_key VARCHAR(64) NOT NULL DEFAULT 'basic',
        source VARCHAR(32) NOT NULL,
        source_reference TEXT,
        status VARCHAR(32) NOT NULL,
        starts_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_entitlements_family
        ON family_entitlements (family_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_entitlements_family_key
        ON family_entitlements (family_id, entitlement_key)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_family_entitlements_grandfather_unique
        ON family_entitlements (family_id, entitlement_key)
        WHERE source = 'grandfathered' AND revoked_at IS NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id UUID REFERENCES family(id) ON DELETE SET NULL,
        gift_order_id UUID,
        gift_card_id UUID,
        source VARCHAR(32),
        store VARCHAR(16),
        plan VARCHAR(32),
        event_type VARCHAR(64) NOT NULL,
        status VARCHAR(32),
        amount_minor INTEGER,
        currency CHAR(3),
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        external_event_id TEXT,
        external_transaction_id TEXT,
        admin_id UUID REFERENCES parent(id) ON DELETE SET NULL,
        reason TEXT,
        correlation_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_audit_family
        ON payment_audit_log (family_id, occurred_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_audit_correlation
        ON payment_audit_log (correlation_id)
        WHERE correlation_id IS NOT NULL
    `);

    await client.query(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('payment_start_at', $1::jsonb, NOW())
      ON CONFLICT (key) DO NOTHING
    `, [JSON.stringify(DEFAULT_PAYMENT_START_AT)]);

    await client.query(`
      INSERT INTO app_config (key, value, description, updated_at)
      VALUES (
        'payment_start_at',
        $1,
        'Canonical payment start + grandfather cutoff',
        NOW()
      )
      ON CONFLICT (key) DO NOTHING
    `, [DEFAULT_PAYMENT_START_AT]);

    // Idempotent grandfather backfill — SE-only (Swedish payment_start_at cutoff)
    const backfill = await client.query(`
      INSERT INTO family_entitlements (
        family_id, entitlement_key, source, source_reference, status,
        starts_at, expires_at, granted_at, metadata
      )
      SELECT
        f.id,
        'basic',
        'grandfathered',
        'payment_start_cutoff',
        'grandfathered',
        f.created_at,
        NULL,
        NOW(),
        jsonb_build_object(
          'backfill', true,
          'payment_start_at', $1::text,
          'country_code', COALESCE(f.country_code, 'SE')
        )
      FROM family f
      WHERE f.created_at < $2::timestamptz
        AND COALESCE(f.country_code, 'SE') = 'SE'
        AND NOT EXISTS (
          SELECT 1 FROM family_entitlements fe
          WHERE fe.family_id = f.id
            AND fe.entitlement_key = 'basic'
            AND fe.source = 'grandfathered'
            AND fe.revoked_at IS NULL
        )
      RETURNING family_id
    `, [DEFAULT_PAYMENT_START_AT, DEFAULT_PAYMENT_START_AT]);

    if (backfill.rowCount > 0) {
      await client.query(`
        UPDATE family f
        SET is_lifetime_free = true,
            updated_at = NOW()
        WHERE f.id = ANY($1::uuid[])
      `, [backfill.rows.map((r) => r.family_id)]);
    }

    console.log(`[migration] payments_v1 grandfather backfill: ${backfill.rowCount} families`);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS payment_audit_log');
    await client.query('DROP TABLE IF EXISTS family_entitlements');
    await client.query(`DELETE FROM app_settings WHERE key = 'payment_start_at'`);
    await client.query(`DELETE FROM app_config WHERE key = 'payment_start_at'`);
  },
};
