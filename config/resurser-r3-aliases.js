'use strict';

/**
 * SEO slug aliases for R3 long-tail pages.
 * Searchers often query "{topic}schema-barn-gratis" while canonical slugs are "bildschema-{topic}-barn".
 */
const { R3_LONGTAIL_PAGES } = require('./resurser-r3');

function buildR3SlugAliases() {
  const aliases = new Map();
  const canonicalSlugs = new Set(R3_LONGTAIL_PAGES.map((p) => p.slug));

  for (const page of R3_LONGTAIL_PAGES) {
    const match = page.slug.match(/^bildschema-(.+)-barn$/);
    if (!match) continue;

    const topic = match[1];
    const candidates = [
      `${topic}schema-barn-gratis`,
      `${topic}schema-barn`,
      `bildschema-${topic}-gratis`,
    ];

    for (const legacySlug of candidates) {
      if (legacySlug === page.slug || canonicalSlugs.has(legacySlug)) continue;
      if (!aliases.has(legacySlug)) {
        aliases.set(legacySlug, page.slug);
      }
    }
  }

  return aliases;
}

const R3_SLUG_ALIASES = buildR3SlugAliases();

const R3_ALIAS_REDIRECTS = [...R3_SLUG_ALIASES.entries()].map(([fromSlug, toSlug]) => ({
  from: `/resurser/${fromSlug}`,
  to: `/resurser/${toSlug}`,
}));

module.exports = {
  R3_SLUG_ALIASES,
  R3_ALIAS_REDIRECTS,
  buildR3SlugAliases,
};
