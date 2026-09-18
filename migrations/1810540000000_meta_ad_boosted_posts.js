'use strict';

/**
 * Boosted page posts share the Meta Ads approval queue.
 * kind=boost uses an existing facebook_post_id instead of a dark-post creative.
 */

module.exports = {
  name: '1810540000000_meta_ad_boosted_posts',
  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: true,
  },
  up: async (client) => {
    await client.query(`
      ALTER TABLE meta_ad_campaign
        ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'traffic',
        ADD COLUMN IF NOT EXISTS source_post_id VARCHAR(128)
    `);

    await client.query(`
      ALTER TABLE meta_ad_campaign
        ALTER COLUMN destination_url DROP NOT NULL
    `);

    await client.query(`
      ALTER TABLE meta_ad_campaign
        DROP CONSTRAINT IF EXISTS meta_ad_campaign_objective_chk
    `);
    await client.query(`
      ALTER TABLE meta_ad_campaign
        ADD CONSTRAINT meta_ad_campaign_objective_chk
        CHECK (objective IN ('OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT'))
    `);

    await client.query(`
      ALTER TABLE meta_ad_campaign
        DROP CONSTRAINT IF EXISTS meta_ad_campaign_kind_chk
    `);
    await client.query(`
      ALTER TABLE meta_ad_campaign
        ADD CONSTRAINT meta_ad_campaign_kind_chk
        CHECK (kind IN ('traffic', 'boost'))
    `);

    await client.query(`
      ALTER TABLE meta_ad_campaign
        DROP CONSTRAINT IF EXISTS meta_ad_campaign_kind_shape_chk
    `);
    await client.query(`
      ALTER TABLE meta_ad_campaign
        ADD CONSTRAINT meta_ad_campaign_kind_shape_chk
        CHECK (
          (kind = 'traffic' AND objective = 'OUTCOME_TRAFFIC' AND destination_url IS NOT NULL)
          OR
          (kind = 'boost' AND objective = 'OUTCOME_ENGAGEMENT' AND source_post_id IS NOT NULL)
        )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_meta_ad_campaign_kind_created
        ON meta_ad_campaign (kind, created_at DESC)
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE meta_ad_campaign
        DROP CONSTRAINT IF EXISTS meta_ad_campaign_kind_shape_chk
    `);
    await client.query(`
      ALTER TABLE meta_ad_campaign
        DROP CONSTRAINT IF EXISTS meta_ad_campaign_kind_chk
    `);
    await client.query(`
      ALTER TABLE meta_ad_campaign
        DROP CONSTRAINT IF EXISTS meta_ad_campaign_objective_chk
    `);
    await client.query(`
      ALTER TABLE meta_ad_campaign
        ADD CONSTRAINT meta_ad_campaign_objective_chk
        CHECK (objective = 'OUTCOME_TRAFFIC')
    `);
    await client.query(`
      DELETE FROM meta_ad_campaign WHERE kind = 'boost' OR destination_url IS NULL
    `);
    await client.query(`
      ALTER TABLE meta_ad_campaign
        ALTER COLUMN destination_url SET NOT NULL
    `);
    await client.query('DROP INDEX IF EXISTS idx_meta_ad_campaign_kind_created');
    await client.query(`
      ALTER TABLE meta_ad_campaign
        DROP COLUMN IF EXISTS source_post_id,
        DROP COLUMN IF EXISTS kind
    `);
  },
};
