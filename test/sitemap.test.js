'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildSitemapXml } = require('../src/lib/sitemap');
const { SEO_INDEXABLE_PATHS } = require('../src/lib/seo-pages');

describe('sitemap', () => {
  it('includes all SEO_INDEXABLE_PATHS', () => {
    const xml = buildSitemapXml();
    for (const p of SEO_INDEXABLE_PATHS) {
      const loc = p === '/' ? 'https://mystarday.se/' : `https://mystarday.se${p}`;
      assert.match(xml, new RegExp(escapeRegex(loc)), `missing ${p}`);
    }
  });

  it('does not include login or dashboard', () => {
    const xml = buildSitemapXml();
    assert.doesNotMatch(xml, /\/login/);
    assert.doesNotMatch(xml, /\/dashboard/);
  });
});

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
