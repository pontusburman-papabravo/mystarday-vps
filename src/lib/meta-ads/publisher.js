'use strict';

const { getMetaAdsConfig } = require('./config');
const { requirePublishableCreative, withCampaignUtm } = require('./schema');
const { createGraphClientFromEnv, MetaAdsGraphError } = require('./graph');

function firstImageHash(payload) {
  const images = payload && payload.images;
  if (!images || typeof images !== 'object') return null;
  const first = Object.values(images)[0];
  return first && first.hash ? String(first.hash) : null;
}

async function publishApprovedCampaign(campaign, options = {}) {
  requirePublishableCreative(campaign);
  const config = getMetaAdsConfig();
  const client = options.graphClient || createGraphClientFromEnv();
  const destinationUrl = withCampaignUtm(campaign.destination_url, campaign.slug);
  const ids = {
    meta_image_hash: campaign.meta_image_hash || null,
    meta_campaign_id: campaign.meta_campaign_id || null,
    meta_adset_id: campaign.meta_adset_id || null,
    meta_creative_id: campaign.meta_creative_id || null,
    meta_ad_id: campaign.meta_ad_id || null,
  };

  if (!ids.meta_image_hash) {
    const uploaded = await client.graph('POST', `${config.adAccountId}/adimages`, {
      url: campaign.image_url,
    });
    ids.meta_image_hash = firstImageHash(uploaded);
    if (!ids.meta_image_hash) {
      throw new MetaAdsGraphError('Meta returnerade ingen image hash');
    }
  }

  if (!ids.meta_campaign_id) {
    const created = await client.graph('POST', `${config.adAccountId}/campaigns`, {
      name: campaign.name,
      objective: campaign.objective,
      status: 'PAUSED',
      special_ad_categories: [],
      buying_type: 'AUCTION',
    });
    ids.meta_campaign_id = created.id;
  }

  if (!ids.meta_adset_id) {
    const adsetBody = {
      name: `${campaign.name} — ad set`,
      campaign_id: ids.meta_campaign_id,
      daily_budget: campaign.daily_budget_ore,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'LINK_CLICKS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      destination_type: 'WEBSITE',
      targeting: {
        geo_locations: { countries: campaign.countries },
        age_min: campaign.age_min,
        age_max: campaign.age_max,
        publisher_platforms: ['facebook', 'instagram'],
      },
      status: 'PAUSED',
    };
    if (campaign.lifetime_budget_ore) {
      delete adsetBody.daily_budget;
      adsetBody.lifetime_budget = campaign.lifetime_budget_ore;
    }
    const created = await client.graph('POST', `${config.adAccountId}/adsets`, adsetBody);
    ids.meta_adset_id = created.id;
  }

  if (!ids.meta_creative_id) {
    const linkData = {
      message: campaign.primary_text,
      link: destinationUrl,
      name: campaign.headline,
      image_hash: ids.meta_image_hash,
      call_to_action: {
        type: campaign.call_to_action,
        value: { link: destinationUrl },
      },
    };
    if (campaign.description) linkData.description = campaign.description;
    const objectStorySpec = {
      page_id: config.pageId,
      link_data: linkData,
    };
    if (config.instagramActorId) {
      objectStorySpec.instagram_user_id = config.instagramActorId;
    }
    const created = await client.graph('POST', `${config.adAccountId}/adcreatives`, {
      name: `${campaign.name} — creative`,
      object_story_spec: objectStorySpec,
    });
    ids.meta_creative_id = created.id;
  }

  if (!ids.meta_ad_id) {
    const created = await client.graph('POST', `${config.adAccountId}/ads`, {
      name: `${campaign.name} — ad`,
      adset_id: ids.meta_adset_id,
      creative: { creative_id: ids.meta_creative_id },
      status: 'PAUSED',
    });
    ids.meta_ad_id = created.id;
  }

  await client.graph('POST', ids.meta_campaign_id, { status: 'ACTIVE' });
  await client.graph('POST', ids.meta_adset_id, { status: 'ACTIVE' });
  await client.graph('POST', ids.meta_ad_id, { status: 'ACTIVE' });

  return ids;
}

async function setCampaignStatusOnMeta(metaCampaignId, status, options = {}) {
  const client = options.graphClient || createGraphClientFromEnv();
  await client.graph('POST', metaCampaignId, { status });
}

async function fetchCampaignInsights(metaCampaignId, options = {}) {
  const client = options.graphClient || createGraphClientFromEnv();
  return client.graph('GET', `${metaCampaignId}/insights`, {
    fields: 'impressions,clicks,spend,ctr,cpc,cpp,reach,actions',
    date_preset: options.datePreset || 'last_7d',
  });
}

module.exports = {
  publishApprovedCampaign,
  setCampaignStatusOnMeta,
  fetchCampaignInsights,
  firstImageHash,
};
