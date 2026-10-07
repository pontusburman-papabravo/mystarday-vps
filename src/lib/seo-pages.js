/**
 * SEO indexability — which HTML paths may be indexed by search engines.
 * All other HTML responses get <meta name="robots" content="noindex, follow"> injected.
 */

const { R1_INDEXABLE_PATHS } = require('../../config/resurser-r1');
const { R2_INDEXABLE_PATHS } = require('../../config/resurser-r2');
const { R3_INDEXABLE_PATHS } = require('../../config/resurser-r3');
const { isResurserIndexable } = require('../../config/resurser-consolidation');
const { allEnglishIndexablePaths } = require('../../config/en-public-mirror');
const { indexablePathsForLocale } = require('../../config/web-content-keys');
const { publicPathLocales } = require('../../config/web-locales');
const { localeMeetsSeoContract } = require('./locale-seo-contract');
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
  ...(localeMeetsSeoContract('en') ? [
    '/en',
    '/en/how-it-works',
    ...allEnglishIndexablePaths().filter((p) => isEnglishContentIndexable(p)),
  ] : []),
  ...publicPathLocales()
    .filter((locale) => locale.code !== 'en' && localeMeetsSeoContract(locale.code))
    .flatMap((locale) => indexablePathsForLocale(locale.code)),
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

/**
 * Paths Google must not crawl.
 *
 * App, auth and admin HTML is noindex, and must stay crawlable. A robots.txt
 * Disallow on a URL Google has already indexed becomes
 * "Indexed, though blocked by robots.txt": Google keeps the URL and cannot
 * see the noindex tag that would drop it. That was the Search Console reason
 * in October 2026, including URLs still tied to an older sitemap.
 *
 * /api/ is not a document. Crawling it spends budget and hits rate limits.
 */
const SEO_CRAWL_DISALLOW_PATHS = [
  '/api/',
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

/**
 * Google's robots.txt rule: longest matching path wins. Allow wins a tie.
 * Used to keep sitemap URLs off every Disallow prefix.
 */
function isCrawlDisallowed(pathname) {
  const raw = String(pathname || '').split('?')[0] || '/';
  const rules = [
    { allow: true, path: '/' },
    ...SEO_CRAWL_DISALLOW_PATHS.map((path) => ({ allow: false, path })),
  ];
  let best = null;
  for (const rule of rules) {
    if (!rule.path || !raw.startsWith(rule.path)) continue;
    const longer = !best || rule.path.length > best.path.length;
    const allowWinsTie = best && rule.path.length === best.path.length && rule.allow && !best.allow;
    if (longer || allowWinsTie) best = rule;
  }
  return !!(best && !best.allow);
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
  isCrawlDisallowed,
  NOINDEX_META,
};
