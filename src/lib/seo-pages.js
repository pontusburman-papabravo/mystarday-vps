/**
 * SEO indexability — which HTML paths may be indexed by search engines.
 * All other HTML responses get <meta name="robots" content="noindex"> injected.
 */

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
  '/morgonrutin-barn',
  '/beloningssystem-barn',
  '/rutiner-npf-barn',
  '/bildschema-app',
  '/alternativ-bildschema-tavla',
  '/veckoschema-bildstod',
  '/resurser',
]);

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
  normalizeSeoPath,
  isSeoIndexable,
  injectNoindexMeta,
  NOINDEX_META,
};
