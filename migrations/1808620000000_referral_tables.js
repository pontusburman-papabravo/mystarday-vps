'use strict';

module.exports = {
  name: '1808620000000_referral_tables',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS referral_code (
        parent_id UUID PRIMARY KEY REFERENCES parent(id) ON DELETE CASCADE,
        code VARCHAR(12) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS referral (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        referred_family_id UUID REFERENCES family(id) ON DELETE SET NULL,
        code VARCHAR(12) NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'qualified', 'rejected')),
        qualified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_referrer ON referral(referrer_parent_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_status ON referral(status)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_referred_family
        ON referral(referred_family_id) WHERE referred_family_id IS NOT NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS referral');
    await client.query('DROP TABLE IF EXISTS referral_code');
  },
};
