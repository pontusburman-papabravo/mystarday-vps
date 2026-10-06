/**
 * SEO indexability — which HTML paths may be indexed by search engines.
 * All other HTML responses get <meta name="robots" content="noindex, follow"> injected.
 */

const { R1_INDEXABLE_PATHS } = require('../../config/resurser-r1');
const { R2_INDEXABLE_PATHS } = require('../../config/resurser-r2');
const { R3_INDEXABLE_PATHS } = require('../../config/resurser-r3');
const { isResurserIndexable } = require('../../config/resurser-consolidation');
const { allEnglishIndexablePaths } = require('../../config/en-public-mirror');
const { isEnglishContentIndexable, sitemapAudienceForHost, englishOrigin, swedishOrigin } = require('./public-seo');

const SITE_URL = swedishOrigin();

const SEO_INDEXABLE_PATHS = new Set([
  '/',
  '/register',
  '/pedagoger-och-terapeuter',
  '/skattkammaren',
  '/pricing-info',
  '/faq',
  '/kontakt',
  '/om-oss',
  '/privacy',
  '/terms',
  '/en',
  '/en/how-it-works',
  ...allEnglishIndexablePaths().filter((p) => isEnglishContentIndexable(p)),
  '/morgonrutin-barn',
  '/beloningssystem-barn',
  '/rutiner-npf-barn',
  '/bildschema-app',
  '/alternativ-bildschema-tavla',
  '/veckoschema-bildstod',
  ...(isResurserIndexable('/resurser') ? ['/resurser'] : []),
  ...R1_INDEXABLE_PATHS.filter(isResurserIndexable),
  ...R2_INDEXABLE_PATHS.filter(isResurserIndexable),
  ...R3_INDEXABLE_PATHS.filter(isResurserIndexable),
]);

/** App/auth/admin paths — noindex + robots Disallow (not marketing SEO). */
const SEO_CRAWL_DISALLOW_PATHS = [
  '/api/',
  '/admin',
  '/login',
  '/child-login',
  '/dashboard',
  '/activities',
  '/notifications',
  '/schedule',
  '/daily-log',
  '/family',
  '/settings',
  '/library',
  '/calendar',
  '/onboarding',
  '/onboarding/film-preview',
  '/child-wizard',
  '/child-dashboard',
  '/child/',
  '/planning',
  '/rewards',
  '/for-dig',
  '/assign-schedule',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
  '/pedagog-invite',
  '/print-schema',
  '/upgrade',
  '/payment-success',
  '/child-settings',
  '/home',
  '/paywall',
  '/en/login',
  '/en/register',
  '/en/forgot-password',
];

function normalizeSeoPath(path) {
  if (!path) return '';
  let p = String(path).split('?')[0].replace(/\/$/, '') || '/';
  if (p.endsWith('.html')) p = p.slice(0, -5);
  return p;
}

function isSeoIndexable(path) {
  return SEO_INDEXABLE_PATHS.has(normalizeSeoPath(path));
}

const NOINDEX_META = '<meta name="robots" content="noindex, follow">';

function buildRobotsTxt(opts = {}) {
  const audience = sitemapAudienceForHost(opts.host);
  const origin = audience === 'en' ? englishOrigin() : SITE_URL;
  const lines = [
    'User-agent: *',
    'Allow: /',
    ...SEO_CRAWL_DISALLOW_PATHS.map((p) => `Disallow: ${p}`),
    '',
    `Sitemap: ${origin}/sitemap.xml`,
  ];
  return `${lines.join('\n')}\n`;
}

function injectNoindexMeta(html, reqPath) {
  if (typeof html !== 'string' || !html.includes('<html')) return html;
  if (isSeoIndexable(reqPath)) return html;
  if (html.includes('name="robots"')) return html;

  const headMarker = '<head>';
  const headIdx = html.indexOf(headMarker);
  if (headIdx === -1) return html;
  return html.slice(0, headIdx + headMarker.length) + '\n    ' + NOINDEX_META + '\n' + html.slice(headIdx + headMarker.length);
}

module.exports = {
  SEO_INDEXABLE_PATHS,
  SEO_CRAWL_DISALLOW_PATHS,
  SITE_URL,
  normalizeSeoPath,
  isSeoIndexable,
  injectNoindexMeta,
  buildRobotsTxt,
  NOINDEX_META,
};
