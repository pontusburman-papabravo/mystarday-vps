/**
 * SEO indexability — which HTML paths may be indexed by search engines.
 * All other HTML responses get <meta name="robots" content="noindex"> injected.
 */

const { R1_INDEXABLE_PATHS } = require('../../config/resurser-r1');
const { R2_INDEXABLE_PATHS } = require('../../config/resurser-r2');
const { R3_INDEXABLE_PATHS } = require('../../config/resurser-r3');
const { allEnglishIndexablePaths } = require('../../config/en-public-mirror');

const SITE_URL = (process.env.PUBLIC_SITE_URL || '[REDACTED]').replace(/\/$/, '');

const SEO_INDEXABLE_PATHS = new Set([
  '/',
  '/register',
  '/pedagoger-och-terapeuter',
  '/skattkammaren',
  '/pricing-info',
  '/faq',
  '/kontakt',
  '/privacy',
  '/terms',
  '/en',
  '/en/how-it-works',
  ...allEnglishIndexablePaths(),
  '/morgonrutin-barn',
  '/beloningssystem-barn',
  '/rutiner-npf-barn',
  '/bildschema-app',
  '/alternativ-bildschema-tavla',
  '/veckoschema-bildstod',
  '/resurser',
  ...R1_INDEXABLE_PATHS,
  ...R2_INDEXABLE_PATHS,
  ...R3_INDEXABLE_PATHS,
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

const NOINDEX_META = '<meta name="robots" content="noindex">';

function buildRobotsTxt() {
  const lines = [
    'User-agent: *',
    'Allow: /',
    ...SEO_CRAWL_DISALLOW_PATHS.map((p) => `Disallow: ${p}`),
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
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
