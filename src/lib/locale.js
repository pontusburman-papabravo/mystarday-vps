'use strict';

/**
 * Canonical locale resolution for the family app (sv-SE / en-GB).
 * Single source of truth — do not duplicate locale logic elsewhere.
 */

const SUPPORTED_LOCALES = Object.freeze(['sv-SE', 'en-GB']);
const DEFAULT_LOCALE = 'sv-SE';

const ALIASES = Object.freeze({
  sv: 'sv-SE',
  en: 'en-GB',
  'sv-se': 'sv-SE',
  'en-gb': 'en-GB',
  'en-us': 'en-GB',
});

/**
 * Normalize a raw locale string to canonical BCP 47 or null if unrecognised.
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
function normalizeLocale(raw) {
  if (raw == null || raw === '') return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  if (SUPPORTED_LOCALES.includes(trimmed)) return trimmed;

  const alias = ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  const base = trimmed.split(/[-_]/)[0].toLowerCase();
  if (base === 'sv') return 'sv-SE';
  if (base === 'en') return 'en-GB';

  return null;
}

/**
 * @param {string|null|undefined} raw
 * @returns {boolean}
 */
function isSupportedLocale(raw) {
  return normalizeLocale(raw) !== null;
}

/**
 * Validate and return canonical locale, or throw/return default.
 * @param {string|null|undefined} raw
 * @param {{ fallback?: string }} [opts]
 * @returns {string}
 */
function validateLocale(raw, opts = {}) {
  const normalized = normalizeLocale(raw);
  if (normalized) return normalized;
  const fallback = normalizeLocale(opts.fallback) || DEFAULT_LOCALE;
  return fallback;
}

/**
 * Parse Accept-Language header to best supported locale.
 * @param {string|null|undefined} header
 * @returns {string|null}
 */
function parseAcceptLanguage(header) {
  if (!header || typeof header !== 'string') return null;

  const parts = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      let q = 1;
      for (const p of params) {
        const m = p.trim().match(/^q=([\d.]+)/);
        if (m) q = parseFloat(m[1]);
      }
      return { tag: tag.trim(), q };
    })
    .filter((p) => p.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parts) {
    const normalized = normalizeLocale(tag);
    if (normalized) return normalized;
    const base = tag.split('-')[0];
    const fromBase = normalizeLocale(base);
    if (fromBase) return fromBase;
  }

  return null;
}

/**
 * Resolve locale for an unauthenticated request (pre-family).
 * Order: explicit param/body → Accept-Language → default.
 * @param {{ explicit?: string|null, acceptLanguage?: string|null }} input
 * @returns {string}
 */
function resolvePreAuthLocale(input = {}) {
  const fromExplicit = normalizeLocale(input.explicit);
  if (fromExplicit) return fromExplicit;

  const fromHeader = parseAcceptLanguage(input.acceptLanguage);
  if (fromHeader) return fromHeader;

  return DEFAULT_LOCALE;
}

/**
 * Resolve locale for an authenticated family context.
 * Uses family.preferred_locale only — never auto-changes after creation.
 * @param {string|null|undefined} familyPreferredLocale
 * @returns {string}
 */
function resolveFamilyLocale(familyPreferredLocale) {
  return validateLocale(familyPreferredLocale, { fallback: DEFAULT_LOCALE });
}

/**
 * Map family locale to journey_experience_registry locale column.
 * Legacy rows may use 'sv'; new rows use 'sv-SE'.
 * @param {string} familyLocale
 * @returns {string[]}
 */
function journeyLocaleCandidates(familyLocale) {
  const canonical = resolveFamilyLocale(familyLocale);
  const candidates = [canonical];
  if (canonical === 'sv-SE') candidates.push('sv');
  if (canonical === 'en-GB') candidates.push('en');
  return candidates;
}

/**
 * Map family locale to experience pack id.
 * @param {string} familyLocale
 * @returns {string}
 */
function experiencePackIdForLocale(familyLocale) {
  const canonical = resolveFamilyLocale(familyLocale);
  return canonical === 'en-GB' ? 'child_en' : 'child_se';
}

/**
 * BCP 47 → HTML lang attribute (lowercase region).
 * @param {string} locale
 * @returns {string}
 */
function htmlLang(locale) {
  const canonical = validateLocale(locale);
  return canonical.toLowerCase();
}

module.exports = {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  ALIASES,
  normalizeLocale,
  isSupportedLocale,
  validateLocale,
  parseAcceptLanguage,
  resolvePreAuthLocale,
  resolveFamilyLocale,
  journeyLocaleCandidates,
  experiencePackIdForLocale,
  htmlLang,
};
