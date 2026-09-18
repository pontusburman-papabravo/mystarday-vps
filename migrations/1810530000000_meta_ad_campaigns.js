'use strict';

/**
 * Approval-gated Meta Ads campaigns (admin + Cursor drafts).
 * Spend never goes live without an explicit admin approve action.
 */

module.exports = {
  name: '1810530000000_meta_ad_campaigns',
  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: true,
  },
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS meta_ad_campaign (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(80) NOT NULL,
        name VARCHAR(200) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        objective VARCHAR(64) NOT NULL DEFAULT 'OUTCOME_TRAFFIC',
        destination_url TEXT NOT NULL,
        daily_budget_ore INTEGER NOT NULL,
        lifetime_budget_ore INTEGER,
        countries TEXT[] NOT NULL DEFAULT ARRAY['SE']::TEXT[],
        age_min INTEGER NOT NULL DEFAULT 25,
        age_max INTEGER NOT NULL DEFAULT 55,
        primary_text TEXT NOT NULL,
        headline VARCHAR(255) NOT NULL,
        description TEXT,
        call_to_action VARCHAR(32) NOT NULL DEFAULT 'LEARN_MORE',
        image_url TEXT,
        hypothesis TEXT NOT NULL,
        primary_metric VARCHAR(80) NOT NULL,
        notes TEXT,
        created_by UUID REFERENCES parent(id) ON DELETE SET NULL,
        created_source VARCHAR(16) NOT NULL DEFAULT 'admin',
        submitted_by UUID REFERENCES parent(id) ON DELETE SET NULL,
        submitted_at TIMESTAMPTZ,
        approved_by UUID REFERENCES parent(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        rejected_by UUID REFERENCES parent(id) ON DELETE SET NULL,
        rejected_at TIMESTAMPTZ,
        reject_reason TEXT,
        paused_by UUID REFERENCES parent(id) ON DELETE SET NULL,
        paused_at TIMESTAMPTZ,
        meta_campaign_id VARCHAR(64),
        meta_adset_id VARCHAR(64),
        meta_creative_id VARCHAR(64),
        meta_ad_id VARCHAR(64),
        meta_image_hash VARCHAR(128),
        last_error TEXT,
        last_insights JSONB,
        last_insights_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT meta_ad_campaign_slug_uniq UNIQUE (slug),
        CONSTRAINT meta_ad_campaign_status_chk CHECK (
          status IN (
            'draft',
            'pending_approval',
            'rejected',
            'publishing',
            'live',
            'paused',
            'failed'
          )
        ),
        CONSTRAINT meta_ad_campaign_objective_chk CHECK (objective = 'OUTCOME_TRAFFIC'),
        CONSTRAINT meta_ad_campaign_source_chk CHECK (created_source IN ('admin', 'cursor')),
        CONSTRAINT meta_ad_campaign_cta_chk CHECK (
          call_to_action IN ('LEARN_MORE', 'SIGN_UP', 'DOWNLOAD')
        ),
        CONSTRAINT meta_ad_campaign_budget_chk CHECK (daily_budget_ore > 0),
        CONSTRAINT meta_ad_campaign_age_chk CHECK (
          age_min >= 18 AND age_max <= 65 AND age_min <= age_max
        )
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_meta_ad_campaign_status_created
        ON meta_ad_campaign (status, created_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS meta_ad_campaign_action (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES meta_ad_campaign(id) ON DELETE CASCADE,
        action VARCHAR(32) NOT NULL,
        actor_id UUID REFERENCES parent(id) ON DELETE SET NULL,
        actor_source VARCHAR(16) NOT NULL DEFAULT 'admin',
        detail JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT meta_ad_campaign_action_source_chk CHECK (
          actor_source IN ('admin', 'cursor', 'system')
        )
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_meta_ad_campaign_action_campaign
        ON meta_ad_campaign_action (campaign_id, created_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS meta_ad_campaign_action');
    await client.query('DROP TABLE IF EXISTS meta_ad_campaign');
  },
};
