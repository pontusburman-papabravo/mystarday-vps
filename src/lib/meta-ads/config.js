'use strict';

/**
 * Meta Ads env + spend caps. Tokens stay in env; this module never logs secrets.
 */

const GRAPH_VERSION = 'v25.0';
const GRAPH_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_DAILY_BUDGET_SEK = 200;
const DEFAULT_MAX_LIFETIME_BUDGET_SEK = 3000;
const DEFAULT_MIN_DAILY_BUDGET_SEK = 20;
const ORE_PER_SEK = 100;
const INSIGHTS_MIN_INTERVAL_MS = 15 * 60 * 1000;

const LIVE_DESTINATION_HOSTS = Object.freeze([
  'mystarday.se', // pragma: allowlist secret
  'www.mystarday.se', // pragma: allowlist secret
  'mystarday.eu', // pragma: allowlist secret
  'www.mystarday.eu', // pragma: allowlist secret
  'mystarday.app', // pragma: allowlist secret
  'www.mystarday.app', // pragma: allowlist secret
]);

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function normalizeAdAccountId(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  return value.startsWith('act_') ? value : `act_${value}`;
}

function getAllowedDestinationHosts() {
  const hosts = [...LIVE_DESTINATION_HOSTS];
  if (process.env.NODE_ENV !== 'production') { // pragma: allowlist secret
    hosts.push('localhost', '127.0.0.1');
  }
  return hosts;
}

function getMetaAdsConfig() {
  return {
    accessToken: String(process.env.META_ADS_ACCESS_TOKEN || '').trim(),
    adAccountId: normalizeAdAccountId(process.env.META_AD_ACCOUNT_ID),
    pageId: String(process.env.META_ADS_PAGE_ID || process.env.FACEBOOK_PAGE_ID || '').trim(),
    instagramActorId: String(process.env.META_ADS_INSTAGRAM_ACTOR_ID || '').trim(),
    pixelId: String(process.env.META_ADS_PIXEL_ID || '').trim(),
    maxDailyBudgetSek: parsePositiveInt(
      process.env.META_ADS_MAX_DAILY_BUDGET_SEK,
      DEFAULT_MAX_DAILY_BUDGET_SEK
    ),
    maxLifetimeBudgetSek: parsePositiveInt(
      process.env.META_ADS_MAX_LIFETIME_BUDGET_SEK,
      DEFAULT_MAX_LIFETIME_BUDGET_SEK
    ),
    minDailyBudgetSek: parsePositiveInt(
      process.env.META_ADS_MIN_DAILY_BUDGET_SEK,
      DEFAULT_MIN_DAILY_BUDGET_SEK
    ),
    graphVersion: String(process.env.META_ADS_GRAPH_VERSION || GRAPH_VERSION).trim(),
    graphTimeoutMs: GRAPH_TIMEOUT_MS,
    allowedHosts: getAllowedDestinationHosts(),
  };
}

function isMetaAdsConfigured() {
  const config = getMetaAdsConfig();
  return Boolean(config.accessToken && config.adAccountId && config.pageId);
}

function getPublicMetaAdsConfig() {
  const config = getMetaAdsConfig();
  return {
    configured: isMetaAdsConfigured(),
    adAccountId: config.adAccountId || null,
    pageId: config.pageId || null,
    hasInstagram: Boolean(config.instagramActorId),
    hasPixel: Boolean(config.pixelId),
    maxDailyBudgetSek: config.maxDailyBudgetSek,
    maxLifetimeBudgetSek: config.maxLifetimeBudgetSek,
    minDailyBudgetSek: config.minDailyBudgetSek,
    graphVersion: config.graphVersion,
    allowedHosts: config.allowedHosts,
    objective: 'OUTCOME_TRAFFIC',
    boostObjective: 'OUTCOME_ENGAGEMENT',
    insightsMinIntervalMs: INSIGHTS_MIN_INTERVAL_MS,
  };
}

function sekToOre(sek) {
  return Math.round(Number(sek) * ORE_PER_SEK);
}

function oreToSek(ore) {
  return Math.round(Number(ore)) / ORE_PER_SEK;
}

module.exports = {
  GRAPH_VERSION,
  GRAPH_TIMEOUT_MS,
  DEFAULT_MAX_DAILY_BUDGET_SEK,
  DEFAULT_MAX_LIFETIME_BUDGET_SEK,
  DEFAULT_MIN_DAILY_BUDGET_SEK,
  ORE_PER_SEK,
  INSIGHTS_MIN_INTERVAL_MS,
  LIVE_DESTINATION_HOSTS,
  getMetaAdsConfig,
  isMetaAdsConfigured,
  getPublicMetaAdsConfig,
  getAllowedDestinationHosts,
  sekToOre,
  oreToSek,
};
