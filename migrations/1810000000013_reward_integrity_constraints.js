/**
 * Reward redemption integrity: snapshots, pending uniqueness, status/cost checks.
 */
module.exports = {
  name: '1810000000013_reward_integrity_constraints',

  up: async (client) => {
    await client.query(`
      ALTER TABLE reward_redemption
        ADD COLUMN IF NOT EXISTS reward_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS reward_icon VARCHAR(32)
    `);

    await client.query(`
      UPDATE reward_redemption rr
      SET reward_name = r.name,
          reward_icon = r.icon
      FROM reward r
      WHERE rr.reward_id = r.id
        AND rr.reward_name IS NULL
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'reward_star_cost_non_negative'
        ) THEN
          ALTER TABLE reward
            ADD CONSTRAINT reward_star_cost_non_negative CHECK (star_cost >= 0);
        END IF;
      END $$
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'reward_redemption_star_cost_non_negative'
        ) THEN
          ALTER TABLE reward_redemption
            ADD CONSTRAINT reward_redemption_star_cost_non_negative CHECK (star_cost IS NULL OR star_cost >= 0);
        END IF;
      END $$
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'reward_redemption_status_valid'
        ) THEN
          ALTER TABLE reward_redemption
            ADD CONSTRAINT reward_redemption_status_valid
            CHECK (status IN ('pending', 'approved', 'denied', 'auto'));
        END IF;
      END $$
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_redemption_one_pending_per_reward
      ON reward_redemption (reward_id)
      WHERE status = 'pending'
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_redemption_child_reward_pending
      ON reward_redemption (child_id, reward_id)
      WHERE status = 'pending'
    `);

    // redeemed_at marks fulfillment time — only set on approved/auto, never pending/denied.
    await client.query(`
      UPDATE reward_redemption
      SET redeemed_at = NULL
      WHERE status IN ('pending', 'denied')
    `);

    await client.query(`
      UPDATE reward_redemption
      SET redeemed_at = COALESCE(redeemed_at, created_at, NOW())
      WHERE status IN ('approved', 'auto')
        AND redeemed_at IS NULL
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_redemption_one_fulfilled_per_reward
      ON reward_redemption (reward_id)
      WHERE status IN ('approved', 'auto')
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_reward_redemption_one_fulfilled_per_reward');
    await client.query('DROP INDEX IF EXISTS idx_reward_redemption_child_reward_pending');
    await client.query('DROP INDEX IF EXISTS idx_reward_redemption_one_pending_per_reward');
    await client.query('ALTER TABLE reward_redemption DROP CONSTRAINT IF EXISTS reward_redemption_status_valid');
    await client.query('ALTER TABLE reward_redemption DROP CONSTRAINT IF EXISTS reward_redemption_star_cost_non_negative');
    await client.query('ALTER TABLE reward DROP CONSTRAINT IF EXISTS reward_star_cost_non_negative');
    await client.query(`
      ALTER TABLE reward_redemption
        DROP COLUMN IF EXISTS reward_icon,
        DROP COLUMN IF EXISTS reward_name
    `);
  },
};
