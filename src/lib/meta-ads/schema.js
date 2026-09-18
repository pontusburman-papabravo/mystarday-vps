'use strict';

const { z } = require('zod');
const {
  getMetaAdsConfig,
  sekToOre,
  oreToSek,
  getAllowedDestinationHosts,
} = require('./config');
const { assertCopyAllowed } = require('./copy-guard');

const CALL_TO_ACTIONS = ['LEARN_MORE', 'SIGN_UP', 'DOWNLOAD'];
const OBJECTIVES = ['OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT'];
const KINDS = ['traffic', 'boost'];
const SOURCES = ['admin', 'cursor'];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STORY_ID_RE = /^[0-9]+(?:_[0-9]+)?$/;

function slugifyName(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'kampanj';
}

function countriesField() {
  return z
    .array(
      z
        .string()
        .trim()
        .transform((value) => value.toUpperCase())
        .refine((value) => /^[A-Z]{2}$/.test(value), 'Landskod måste vara ISO-2')
    )
    .min(1)
    .max(8)
    .default(['SE']);
}

const SharedCampaignFields = {
  name: z.string().trim().min(3).max(200),
  slug: z.string().trim().regex(SLUG_RE).max(80).optional(),
  daily_budget_sek: z.coerce.number().positive(),
  lifetime_budget_sek: z.coerce.number().positive().optional().nullable(),
  countries: countriesField(),
  age_min: z.coerce.number().int().min(18).max(65).default(25),
  age_max: z.coerce.number().int().min(18).max(65).default(55),
  primary_text: z.string().trim().min(10).max(2200),
  headline: z.string().trim().min(3).max(255),
  description: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.string().trim().max(500).nullable().optional()
  ),
  hypothesis: z.string().trim().min(10).max(1000),
  primary_metric: z.string().trim().min(3).max(80),
  notes: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.string().trim().max(2000).nullable().optional()
  ),
  created_source: z.enum(SOURCES).optional(),
};

const TrafficBriefSchema = z.object({
  kind: z.literal('traffic').default('traffic'),
  objective: z.literal('OUTCOME_TRAFFIC').default('OUTCOME_TRAFFIC'),
  destination_url: z.string().trim().url().refine((value) => {
    try {
      const url = new URL(value);
      if (url.protocol === 'https:') return true;
      return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    } catch {
      return false;
    }
  }, 'URL måste vara https (http tillåts bara på localhost)'),
  call_to_action: z.enum(CALL_TO_ACTIONS).default('LEARN_MORE'),
  image_url: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.string().trim().url().nullable().optional()
  ),
  source_post_id: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.string().trim().nullable().optional()
  ),
  ...SharedCampaignFields,
});

const BoostBriefSchema = z.object({
  kind: z.literal('boost'),
  objective: z.literal('OUTCOME_ENGAGEMENT').default('OUTCOME_ENGAGEMENT'),
  source_post_id: z.string().trim().regex(STORY_ID_RE, 'Ogiltigt Facebook-inläggs-id'),
  destination_url: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.string().trim().url().nullable().optional()
  ),
  call_to_action: z.enum(CALL_TO_ACTIONS).default('LEARN_MORE'),
  image_url: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.string().trim().url().nullable().optional()
  ),
  ...SharedCampaignFields,
});

function resolveKind(input) {
  if (input && input.kind === 'boost') return 'boost';
  if (input && input.kind === 'traffic') return 'traffic';
  if (input && input.objective === 'OUTCOME_ENGAGEMENT') return 'boost';
  if (input && input.source_post_id && !input.destination_url) return 'boost';
  return 'traffic';
}

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

function finishBrief(parsed) {
  if (parsed.age_min > parsed.age_max) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['age_min'],
        message: 'age_min får inte vara högre än age_max',
      },
    ]);
  }
  if (parsed.kind === 'traffic') {
    assertDestinationHost(parsed.destination_url);
  }
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
    destination_url: parsed.destination_url || null,
    source_post_id: parsed.source_post_id || null,
    created_source: parsed.created_source || 'admin',
  };
}

function parseCampaignBrief(input) {
  const kind = resolveKind(input);
  const parsed = kind === 'boost'
    ? BoostBriefSchema.parse({ ...input, kind: 'boost' })
    : TrafficBriefSchema.parse({ ...input, kind: 'traffic' });
  return finishBrief(parsed);
}

function isBoostCampaign(campaign) {
  return campaign && (campaign.kind === 'boost' || campaign.objective === 'OUTCOME_ENGAGEMENT');
}

function requirePublishableCreative(brief) {
  if (isBoostCampaign(brief)) {
    if (!brief.source_post_id) {
      const error = new Error('Facebook-inläggs-id krävs för boost');
      error.code = 'META_ADS_BAD_STORY';
      throw error;
    }
    return;
  }
  if (!brief.image_url) {
    const error = new Error('Bild-URL krävs innan publicering till Meta');
    error.code = 'META_ADS_IMAGE_REQUIRED';
    throw error;
  }
}

function normalizeObjectStoryId(pageId, rawPostId) {
  const value = String(rawPostId || '').trim();
  if (!value) {
    const error = new Error('Facebook-inläggs-id saknas');
    error.code = 'META_ADS_BAD_STORY';
    throw error;
  }
  if (value.includes('_')) return value;
  const page = String(pageId || '').trim();
  if (!page) {
    const error = new Error('Sid-id saknas för att bygga object_story_id');
    error.code = 'META_ADS_BAD_STORY';
    throw error;
  }
  return `${page}_${value}`;
}

function withCampaignUtm(destinationUrl, slug) {
  const url = new URL(destinationUrl);
  if (!url.searchParams.get('utm_source')) url.searchParams.set('utm_source', 'meta');
  if (!url.searchParams.get('utm_medium')) url.searchParams.set('utm_medium', 'paid');
  if (!url.searchParams.get('utm_campaign')) url.searchParams.set('utm_campaign', slug);
  return url.toString();
}

function rowToBriefInput(row) {
  const kind = isBoostCampaign(row) ? 'boost' : 'traffic';
  return {
    kind,
    name: row.name,
    slug: row.slug,
    objective: kind === 'boost' ? 'OUTCOME_ENGAGEMENT' : 'OUTCOME_TRAFFIC',
    destination_url: row.destination_url || undefined,
    source_post_id: row.source_post_id || undefined,
    daily_budget_sek: oreToSek(row.daily_budget_ore),
    lifetime_budget_sek: row.lifetime_budget_ore == null ? null : oreToSek(row.lifetime_budget_ore),
    countries: row.countries,
    age_min: row.age_min,
    age_max: row.age_max,
    primary_text: row.primary_text,
    headline: row.headline,
    description: row.description,
    call_to_action: row.call_to_action,
    image_url: row.image_url,
    hypothesis: row.hypothesis,
    primary_metric: row.primary_metric,
    notes: row.notes,
    created_source: row.created_source,
  };
}

function defaultBoostCopy(nyhet) {
  const title = String(nyhet && nyhet.title ? nyhet.title : 'Sidinlägg').trim();
  const body = String(nyhet && nyhet.body ? nyhet.body : '').trim();
  const primary = body.length >= 10 ? body : `${title} — organisk post som boostas till fler föräldrar.`;
  return {
    name: `Boost: ${title}`.slice(0, 200),
    headline: title.slice(0, 255) || 'Sidinlägg',
    primary_text: primary.slice(0, 2200),
    hypothesis: 'Organiskt sidinlägg boostas till föräldrar i Sverige och ökar räckvidd mot First Success.',
    primary_metric: 'Postengagemang 7d',
  };
}

module.exports = {
  CALL_TO_ACTIONS,
  OBJECTIVES,
  KINDS,
  MetaAdCampaignBriefSchema: TrafficBriefSchema,
  slugifyName,
  parseCampaignBrief,
  assertDestinationHost,
  assertBudgetWithinCaps,
  requirePublishableCreative,
  withCampaignUtm,
  isBoostCampaign,
  normalizeObjectStoryId,
  rowToBriefInput,
  defaultBoostCopy,
};
