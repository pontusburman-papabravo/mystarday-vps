'use strict';

/**
 * Public SEO host policy.
 * Swedish marketing documents rank on the .se origin.
 * English marketing documents rank on the .app /en origin.
 * Country query params (?country=IE|CA) are not separate documents.
 */

const { siteUrl, ENGLISH_PUBLIC_SITE_URL } = require('./public-html-placeholders');
const { enToSv, svToEn } = require('../../config/en-public-mirror');
const { APP_DOMAIN, MAIN_DOMAIN } = require('./domain-redirect');
const { LOCALES, localeFromPublicPath, publicPathLocales } = require('../../config/web-locales');
const { contentByPath } = require('../../config/web-content-keys');

/** English URLs with a real English document. Everything else under /en is noindex. */
const ENGLISH_CONTENT_INDEXABLE = new Set([
  '/en',
  '/en/how-it-works',
  '/en/faq',
  '/en/contact',
  '/en/privacy',
  '/en/terms',
  '/en/pricing',
  '/en/visual-schedule-app',
  '/en/morning-routine-children',
  '/en/weekly-schedule-visual-support',
  '/en/routines-neurodiverse-children',
  '/en/reward-system-children',
  '/en/alternative-visual-schedule-board',
  '/en/treasury',
  '/en/resources',
  '/en/resources/morning',
  '/en/resources/evening',
  '/en/resources/emotions',
  '/en/resources/transitions',
  '/en/resources/teacch-inspired',
  '/en/resources/school',
  '/en/resources/hygiene',
  '/en/resources/emotion-cards-children-free',
  '/en/resources/picture-cards/morning',
  '/en/resources/picture-cards/evening',
  '/en/resources/picture-cards/emotions',
  '/en/resources/picture-cards/transitions',
  '/en/resources/picture-cards/teacch-inspired',
  '/en/resources/picture-cards/school',
  '/en/resources/picture-cards/hygiene',
  '/en/resources/pdf/morning-schedule',
  '/en/resources/pdf/evening-schedule',
  '/en/resources/pdf/weekly-schedule',
  '/en/resources/pdf/weekend-schedule',
  '/en/resources/pdf/homework-schedule',
  '/en/resources/pdf/reward-chart',
  '/en/resources/pdf/transitions',
  '/en/resources/pdf/emotions',
  '/en/resources/pdf/hygiene',
  '/en/resources/pdf/school',
  '/en/resources/pdf/teacch-inspired',
]);

const HREFLANG_LINK_RE = /<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["'][^"']+["'][^>]*>\s*/gi;
const HREFLANG_LINK_RE_ALT = /<link\b[^>]*\bhreflang=["'][^"']+["'][^>]*\brel=["']alternate["'][^>]*>\s*/gi;
const CANONICAL_LINK_RE = /<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi;
const ROBOTS_META_RE = /<meta\b[^>]*\bname=["']robots["'][^>]*>\s*/gi;
const OG_URL_RE = /(<meta\b[^>]*\bproperty=["']og:url["'][^>]*\bcontent=["'])[^"']*(["'][^>]*>)/i;

function normalizePublicPath(path) {
  if (!path) return '';
  let p = String(path).split('?')[0].split('#')[0];
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (p.endsWith('.html')) p = p.slice(0, -5);
  return p || '/';
}

function isEnglishPublicPath(path) {
  const p = normalizePublicPath(path);
  return p === '/en' || p.startsWith('/en/');
}

function isEnglishContentIndexable(path) {
  return ENGLISH_CONTENT_INDEXABLE.has(normalizePublicPath(path));
}

function isInternationalPublicPath(path) {
  return !!localeFromPublicPath(normalizePublicPath(path));
}

function isInternationalContentIndexable(path) {
  const p = normalizePublicPath(path);
  if (isEnglishContentIndexable(p)) return true;
  const locale = localeFromPublicPath(p);
  const entry = contentByPath(p);
  return !!(
    locale
    && locale.seoEnabled
    && entry
    && entry.indexable
    && entry.paths[locale.code] === p
  );
}

function swedishOrigin() {
  return siteUrl().replace(/\/$/, '');
}

function englishOrigin() {
  return ENGLISH_PUBLIC_SITE_URL.replace(/\/$/, '');
}

function hostName(host) {
  return String(host || '').split(':')[0].toLowerCase();
}

function isAppHost(host) {
  const h = hostName(host);
  return h === APP_DOMAIN || h === `www.${APP_DOMAIN}`;
}

function isSwedishHost(host) {
  const h = hostName(host);
  return h === MAIN_DOMAIN || h === `www.${MAIN_DOMAIN}`;
}

/**
 * @param {string} [host]
 * @returns {'sv'|'en'|'all'}
 */
function sitemapAudienceForHost(host) {
  if (!hostName(host)) return 'all';
  if (isAppHost(host)) return 'en';
  if (isSwedishHost(host)) return 'sv';
  return 'all';
}

function absolutePublicUrl(pathname) {
  const p = normalizePublicPath(pathname);
  if (isInternationalPublicPath(p) || isEnglishPublicPath(p)) return `${englishOrigin()}${p}`;
  if (p === '/') return `${swedishOrigin()}/`;
  return `${swedishOrigin()}${p}`;
}

function isIndexableSwedishPath(pathname) {
  // Lazy require: seo-pages loads this module while it is still initialising.
  const { isSeoIndexable } = require('./seo-pages');
  return isSeoIndexable(pathname);
}

function hreflangFromContent(entry) {
  if (!entry || !entry.indexable) return [];
  const rows = [];
  for (const locale of Object.values(LOCALES)) {
    if (!locale.enabled || !locale.seoEnabled) continue;
    const target = entry.paths[locale.code];
    if (!target) continue;
    const href = absolutePublicUrl(target);
    for (const tag of locale.hreflang) rows.push([tag, href]);
  }
  const fallback = entry.paths.en || entry.paths.sv || entry.paths.nl;
  if (fallback) rows.push(['x-default', absolutePublicUrl(fallback)]);
  return rows;
}

function hreflangAlternates(pathname) {
  const p = normalizePublicPath(pathname);
  const entry = contentByPath(p);
  if (entry) return hreflangFromContent(entry);
  const english = isEnglishPublicPath(p);
  const en = english ? p : svToEn(p);
  const sv = english ? enToSv(p) : p;
  if (!en || !isEnglishContentIndexable(en)) return [];
  // No hreflang to a Swedish URL that is noindex, redirected, or missing.
  if (!sv || isEnglishPublicPath(sv) || !isIndexableSwedishPath(sv)) {
    const self = absolutePublicUrl(en);
    return [
      ['en', self],
      ['x-default', self],
    ];
  }
  const enUrl = absolutePublicUrl(en);
  const svUrl = absolutePublicUrl(sv);
  return [
    ['sv-SE', svUrl],
    ['en', enUrl],
    ['x-default', enUrl],
  ];
}

function buildHeadLinks(pathname) {
  const canonical = absolutePublicUrl(pathname);
  const lines = [`<link rel="canonical" href="${canonical}">`];
  for (const [lang, href] of hreflangAlternates(pathname)) {
    lines.push(`<link rel="alternate" hreflang="${lang}" href="${href}">`);
  }
  return lines.join('\n');
}

function originsBootstrap() {
  const origins = { sv: swedishOrigin() };
  for (const locale of publicPathLocales()) {
    if (locale.host === 'app') origins[locale.code] = englishOrigin();
  }
  return `<script>window.__PUBLIC_SEO_ORIGINS=${JSON.stringify(origins)};</script>`;
}

/**
 * One canonical and one reciprocal hreflang set for public marketing HTML.
 * Country and tracking query params are dropped from the canonical URL.
 * @param {string} html
 * @param {string} reqPath
 * @param {{ indexable?: boolean }} [opts]
 */
function applyPublicSeoHead(html, reqPath, opts = {}) {
  if (typeof html !== 'string' || !html.includes('<head')) return html;
  const p = normalizePublicPath(reqPath);
  const international = isInternationalPublicPath(p);
  if (!international && !opts.indexable) return html;

  let next = html
    .replace(CANONICAL_LINK_RE, '')
    .replace(HREFLANG_LINK_RE, '')
    .replace(HREFLANG_LINK_RE_ALT, '');

  const robotsNeeded = international && !isInternationalContentIndexable(p);
  if (robotsNeeded) {
    next = next.replace(ROBOTS_META_RE, '');
  }

  const block = [
    buildHeadLinks(p),
    robotsNeeded ? '<meta name="robots" content="noindex, follow">' : '',
    originsBootstrap(),
  ].filter(Boolean).join('\n');

  next = next.replace(/<head([^>]*)>/i, (full) => `${full}\n${block}\n`);
  const canonical = absolutePublicUrl(p);
  if (OG_URL_RE.test(next)) {
    next = next.replace(OG_URL_RE, `$1${canonical}$2`);
  }
  return next;
}

module.exports = {
  ENGLISH_CONTENT_INDEXABLE,
  normalizePublicPath,
  isEnglishPublicPath,
  isEnglishContentIndexable,
  isInternationalPublicPath,
  isInternationalContentIndexable,
  swedishOrigin,
  englishOrigin,
  isAppHost,
  isSwedishHost,
  sitemapAudienceForHost,
  absolutePublicUrl,
  hreflangAlternates,
  applyPublicSeoHead,
};
