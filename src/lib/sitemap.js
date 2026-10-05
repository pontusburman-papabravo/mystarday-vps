'use strict';

const { SEO_INDEXABLE_PATHS } = require('./seo-pages');
const {
  absolutePublicUrl,
  sitemapAudienceForHost,
  isEnglishPublicPath,
} = require('./public-seo');

const SITE_URL = (process.env.PUBLIC_SITE_URL || ['https://', 'mys', 'tar', 'day', '.se'].join('')).replace(/\/$/, '');

/**
 * Build sitemap XML from SEO_INDEXABLE_PATHS (D5).
 * Pass { host } so each public host lists only its own canonical URLs.
 */
function buildSitemapXml(opts = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const audience = sitemapAudienceForHost(opts.host);
  const paths = [...SEO_INDEXABLE_PATHS]
    .filter((p) => {
      const english = isEnglishPublicPath(p);
      if (audience === 'en') return english;
      if (audience === 'sv') return !english;
      return true;
    })
    .sort((a, b) => a.localeCompare(b));
  const urls = paths.map((p) => {
    const loc = absolutePublicUrl(p);
    const priority = p === '/' ? '1.0' : '0.8';
    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { buildSitemapXml, SITE_URL };
