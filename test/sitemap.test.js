'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildSitemapXml } = require('../src/lib/sitemap');
const { SEO_INDEXABLE_PATHS } = require('../src/lib/seo-pages');
const { absolutePublicUrl } = require('../src/lib/public-seo');

describe('sitemap', () => {
  it('includes all SEO_INDEXABLE_PATHS', () => {
    const xml = buildSitemapXml();
    for (const p of SEO_INDEXABLE_PATHS) {
      const loc = absolutePublicUrl(p);
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
