'use strict';

const { z } = require('zod');
const {
  getMetaAdsConfig,
  sekToOre,
  getAllowedDestinationHosts,
} = require('./config');
const { assertCopyAllowed } = require('./copy-guard');

const CALL_TO_ACTIONS = ['LEARN_MORE', 'SIGN_UP', 'DOWNLOAD'];
const OBJECTIVES = ['OUTCOME_TRAFFIC'];
const SOURCES = ['admin', 'cursor'];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugifyName(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'kampanj';
}

const MetaAdCampaignBriefSchema = z.object({
  name: z.string().trim().min(3).max(200),
  slug: z.string().trim().regex(SLUG_RE).max(80).optional(),
  objective: z.enum(OBJECTIVES).default('OUTCOME_TRAFFIC'),
  destination_url: z.string().trim().url().refine((value) => {
    try {
      const url = new URL(value);
      if (url.protocol === 'https:') return true;
      return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    } catch {
      return false;
    }
  }, 'URL måste vara https (http tillåts bara på localhost)'),
  daily_budget_sek: z.coerce.number().positive(),
  lifetime_budget_sek: z.coerce.number().positive().optional().nullable(),
  countries: z
    .array(
      z
        .string()
        .trim()
        .transform((value) => value.toUpperCase())
        .refine((value) => /^[A-Z]{2}$/.test(value), 'Landskod måste vara ISO-2')
    )
    .min(1)
    .max(8)
    .default(['SE']),
  age_min: z.coerce.number().int().min(18).max(65).default(25),
  age_max: z.coerce.number().int().min(18).max(65).default(55),
  primary_text: z.string().trim().min(10).max(2200),
  headline: z.string().trim().min(3).max(255),
  description: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.string().trim().max(500).nullable().optional()
  ),
  call_to_action: z.enum(CALL_TO_ACTIONS).default('LEARN_MORE'),
  image_url: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.string().trim().url().nullable().optional()
  ),
  hypothesis: z.string().trim().min(10).max(1000),
  primary_metric: z.string().trim().min(3).max(80),
  notes: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.string().trim().max(2000).nullable().optional()
  ),
  created_source: z.enum(SOURCES).optional(),
});

function assertDestinationHost(destinationUrl) {
  let host;
  try {
    host = new URL(destinationUrl).hostname.toLowerCase();
  } catch {
    const error = new Error('Ogiltig destinations-URL');
    error.code = 'META_ADS_BAD_DESTINATION';
    throw error;
  }
  const allowed = getAllowedDestinationHosts();
  if (!allowed.includes(host)) {
    const error = new Error(
      `Destinationsdomänen ${host} är inte tillåten. Tillåtna: ${allowed.join(', ')}`
    );
    error.code = 'META_ADS_BAD_DESTINATION';
    throw error;
  }
}

function assertBudgetWithinCaps(dailyBudgetSek, lifetimeBudgetSek) {
  const config = getMetaAdsConfig();
  if (dailyBudgetSek < config.minDailyBudgetSek) {
    const error = new Error(
      `Dagsbudget minst ${config.minDailyBudgetSek} kr (satt ${dailyBudgetSek} kr)`
    );
    error.code = 'META_ADS_BUDGET_CAP';
    throw error;
  }
  if (dailyBudgetSek > config.maxDailyBudgetSek) {
    const error = new Error(
      `Dagsbudget max ${config.maxDailyBudgetSek} kr utan separat takhöjning (satt ${dailyBudgetSek} kr)`
    );
    error.code = 'META_ADS_BUDGET_CAP';
    throw error;
  }
  if (lifetimeBudgetSek != null) {
    if (lifetimeBudgetSek > config.maxLifetimeBudgetSek) {
      const error = new Error(
        `Livstidsbudget max ${config.maxLifetimeBudgetSek} kr (satt ${lifetimeBudgetSek} kr)`
      );
      error.code = 'META_ADS_BUDGET_CAP';
      throw error;
    }
    if (lifetimeBudgetSek < dailyBudgetSek) {
      const error = new Error('Livstidsbudget måste vara minst dagsbudgeten');
      error.code = 'META_ADS_BUDGET_CAP';
      throw error;
    }
  }
}

function parseCampaignBrief(input) {
  const parsed = MetaAdCampaignBriefSchema.parse(input);
  if (parsed.age_min > parsed.age_max) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['age_min'],
        message: 'age_min får inte vara högre än age_max',
      },
    ]);
  }
  assertDestinationHost(parsed.destination_url);
  assertBudgetWithinCaps(parsed.daily_budget_sek, parsed.lifetime_budget_sek ?? null);
  assertCopyAllowed(parsed);
  const slug = parsed.slug || slugifyName(parsed.name);
  return {
    ...parsed,
    slug,
    daily_budget_ore: sekToOre(parsed.daily_budget_sek),
    lifetime_budget_ore:
      parsed.lifetime_budget_sek == null ? null : sekToOre(parsed.lifetime_budget_sek),
    description: parsed.description || null,
    image_url: parsed.image_url || null,
    notes: parsed.notes || null,
    created_source: parsed.created_source || 'admin',
  };
}

function requirePublishableCreative(brief) {
  if (!brief.image_url) {
    const error = new Error('Bild-URL krävs innan publicering till Meta');
    error.code = 'META_ADS_IMAGE_REQUIRED';
    throw error;
  }
}

function withCampaignUtm(destinationUrl, slug) {
  const url = new URL(destinationUrl);
  if (!url.searchParams.get('utm_source')) url.searchParams.set('utm_source', 'meta');
  if (!url.searchParams.get('utm_medium')) url.searchParams.set('utm_medium', 'paid');
  if (!url.searchParams.get('utm_campaign')) url.searchParams.set('utm_campaign', slug);
  return url.toString();
}

module.exports = {
  CALL_TO_ACTIONS,
  OBJECTIVES,
  MetaAdCampaignBriefSchema,
  slugifyName,
  parseCampaignBrief,
  assertDestinationHost,
  assertBudgetWithinCaps,
  requirePublishableCreative,
  withCampaignUtm,
};
