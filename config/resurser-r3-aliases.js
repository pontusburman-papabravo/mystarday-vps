'use strict';

/**
 * SEO slug aliases for R3 long-tail pages.
 * Searchers often query "{topic}schema-barn-gratis" while canonical slugs are "bildschema-{topic}-barn".
 */
const { R3_LONGTAIL_PAGES } = require('./resurser-r3');
const { resurserRedirectTarget } = require('./resurser-consolidation');

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

const R3_ALIAS_REDIRECTS = [...R3_SLUG_ALIASES.entries()].map(([fromSlug, toSlug]) => {
  const canonical = `/resurser/${toSlug}`;
  return {
    from: `/resurser/${fromSlug}`,
    to: resurserRedirectTarget(canonical) || canonical,
  };
});

const R3_ALIAS_CHAIN_FIX_COUNT = R3_ALIAS_REDIRECTS.filter((row) => {
  const slug = R3_SLUG_ALIASES.get(row.from.slice('/resurser/'.length));
  return row.to !== `/resurser/${slug}`;
}).length;

const R3_ALIAS_FINAL_BY_PATH = new Map(R3_ALIAS_REDIRECTS.map((row) => [row.from, row.to]));

function resurserAliasFinalTarget(pathname) {
  return R3_ALIAS_FINAL_BY_PATH.get(pathname) || null;
}

module.exports = {
  R3_SLUG_ALIASES,
  R3_ALIAS_REDIRECTS,
  R3_ALIAS_CHAIN_FIX_COUNT,
  buildR3SlugAliases,
  resurserAliasFinalTarget,
};
