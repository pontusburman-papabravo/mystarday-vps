'use strict';

/**
 * Normalize + persist first-touch acquisition attribution.
 * Never throws into the registration path — callers should catch/log.
 */

const attributionDb = require('../../db/family-acquisition-attribution');

const FIELD_LIMITS = Object.freeze({
  source: 64,
  medium: 64,
  campaign: 128,
  content: 128,
  term: 128,
  referral_code: 12,
  landing_locale: 16,
  platform: 32,
});

const ALLOWED_PLATFORMS = new Set(['web', 'pwa', 'ios', 'android']);
const ALLOWED_LOCALES = new Set(['sv-SE', 'en-GB', 'sv', 'en']);

/** Patterns that look like secrets/tokens — drop the field. */
const SECRETISH = [
  /bearer\s+/i,
  /eyJ[A-Za-z0-9_-]{20,}/, // JWT-like
  /access_token/i,
  /refresh_token/i,
  /api[_-]?key/i,
  /password/i,
  /secret/i,
  /session[_-]?id/i,
];

/** Fields allowed in durable attribution storage (allowlist). */
const STORED_FIELD_ALLOWLIST = Object.freeze([
  'source',
  'medium',
  'campaign',
  'content',
  'term',
  'referral_code',
  'landing_locale',
  'platform',
  'first_touch_at',
  'registered_at',
]);

function stripMarkup(value) {
  return value
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[#a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampString(value, max) {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = stripMarkup(value.trim());
  if (!trimmed) return null;
  if (trimmed.length > max) return trimmed.slice(0, max);
  return trimmed;
}

function looksSecret(value) {
  if (!value) return false;
  return SECRETISH.some((re) => re.test(value));
}

function looksLikeEmailOrChildId(value) {
  if (!value) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  // UUID-like child/family ids must not land in campaign fields
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return true;
  }
  return false;
}

function normalizeLocale(raw) {
  const v = clampString(raw, FIELD_LIMITS.landing_locale);
  if (!v) return null;
  if (v === 'sv' || v === 'sv-SE') return 'sv-SE';
  if (v === 'en' || v === 'en-GB') return 'en-GB';
  if (ALLOWED_LOCALES.has(v)) return v;
  return null;
}

function normalizePlatform(raw) {
  const v = clampString(raw, FIELD_LIMITS.platform);
  if (!v) return null;
  const lower = v.toLowerCase();
  if (ALLOWED_PLATFORMS.has(lower)) return lower;
  return null;
}

function normalizeReferralCode(raw) {
  const v = clampString(raw, FIELD_LIMITS.referral_code);
  if (!v) return null;
  return v.toUpperCase();
}

/**
 * Map client/register payload → normalized attribution row fields.
 * Accepts utm_* aliases and canonical names. Drops raw URLs and secret-like values.
 * @param {object} input
 * @returns {object|null} null when nothing useful remains
 */
function normalizeAttributionInput(input = {}) {
  if (!input || typeof input !== 'object') return null;

  const source = clampString(input.source ?? input.utm_source, FIELD_LIMITS.source);
  const medium = clampString(input.medium ?? input.utm_medium, FIELD_LIMITS.medium);
  const campaign = clampString(input.campaign ?? input.utm_campaign, FIELD_LIMITS.campaign);
  const content = clampString(input.content ?? input.utm_content, FIELD_LIMITS.content);
  const term = clampString(input.term ?? input.utm_term, FIELD_LIMITS.term);
  const referral_code = normalizeReferralCode(input.referral_code ?? input.ref);
  const landing_locale = normalizeLocale(input.landing_locale ?? input.locale);
  const platform = normalizePlatform(input.platform);

  const fields = {
    source,
    medium,
    campaign,
    content,
    term,
    referral_code,
    landing_locale,
    platform,
  };

  for (const [key, val] of Object.entries(fields)) {
    if (
      val &&
      (looksSecret(val) ||
        looksLikeEmailOrChildId(val) ||
        /https?:\/\//i.test(val) ||
        /javascript:/i.test(val))
    ) {
      fields[key] = null;
    }
  }

  const hasCampaignSignal = Boolean(
    fields.source ||
      fields.medium ||
      fields.campaign ||
      fields.content ||
      fields.term ||
      fields.referral_code
  );

  // Direct / organic only when platform/locale alone (no campaign fields survived)
  if (!hasCampaignSignal) {
    if (platform || landing_locale) {
      return {
        source: 'direct',
        medium: 'none',
        campaign: null,
        content: null,
        term: null,
        referral_code: null,
        landing_locale,
        platform,
        first_touch_at: parseTimestamp(input.first_touch_at) || new Date(),
      };
    }
    return null;
  }

  return {
    ...fields,
    first_touch_at: parseTimestamp(input.first_touch_at) || new Date(),
  };
}

function parseTimestamp(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  // Reject future-dated first-touch (>1 day)
  if (d.getTime() > Date.now() + 24 * 60 * 60 * 1000) return null;
  return d;
}

/**
 * Idempotent first-touch upsert. Safe to call from register/oauth; never throws.
 * @param {string} familyId
 * @param {object} rawInput
 * @param {{ registeredAt?: Date }} [opts]
 * @returns {Promise<{ stored: boolean, reason?: string }>}
 */
async function recordFamilyAttribution(familyId, rawInput, opts = {}) {
  if (!familyId) return { stored: false, reason: 'missing_family' };
  try {
    const normalized = normalizeAttributionInput(rawInput);
    if (!normalized) return { stored: false, reason: 'empty' };
    const row = await attributionDb.upsertFirstTouch(familyId, {
      ...normalized,
      registered_at: opts.registeredAt || new Date(),
    });
    return { stored: Boolean(row), reason: row ? 'ok' : 'already_set' };
  } catch (err) {
    console.error('[ATTRIBUTION] recordFamilyAttribution failed:', err.message);
    return { stored: false, reason: 'error' };
  }
}

/**
 * Build analytics metadata (utm_* keys) without secrets — for signup_attribution event.
 */
function toAnalyticsMetadata(normalized) {
  if (!normalized) return {};
  const out = {};
  if (normalized.source) out.utm_source = normalized.source;
  if (normalized.medium) out.utm_medium = normalized.medium;
  if (normalized.campaign) out.utm_campaign = normalized.campaign;
  if (normalized.content) out.utm_content = normalized.content;
  if (normalized.term) out.utm_term = normalized.term;
  if (normalized.referral_code) out.referral_code = normalized.referral_code;
  if (normalized.landing_locale) out.landing_locale = normalized.landing_locale;
  if (normalized.platform) out.platform = normalized.platform;
  return out;
}

module.exports = {
  FIELD_LIMITS,
  STORED_FIELD_ALLOWLIST,
  normalizeAttributionInput,
  recordFamilyAttribution,
  toAnalyticsMetadata,
};
