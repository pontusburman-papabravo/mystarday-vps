'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runAudit } = require('../scripts/eu-web-seo-qa');

test('public web QA crawl is ready for the EU rollout', async () => {
  const report = await runAudit();
  assert.equal(report.verdict, 'READY_FOR_EU_WEB_ROLLOUT');
  assert.equal(report.markets.euEea, 29);
  assert.deepEqual(report.markets.missing, []);
  assert.deepEqual(report.markets.duplicate, []);
  assert.deepEqual(report.markets.wrongIso, []);
  assert.equal(report.markets.canadaSeparate, true);
  assert.equal(report.markets.canadaPath, '/en/ca');
  assert.equal(report.locales.configured, 26);
  assert.equal(report.locales.seoEnabled, 26);
  assert.equal(report.locales.complete, 26);
  assert.equal(report.counts.indexable, 338);
  assert.equal(report.counts.appSitemap, 305);
  assert.equal(report.counts.seSitemap, 33);
  assert.equal(report.counts.perLocale.sv, 33);
  assert.equal(report.counts.perLocale.en, 41);
  assert.equal(report.counts.perLocale.de, 11);
  assert.equal(report.counts.perLocale.ga, 11);
  assert.equal(report.counts.perLocale.mt, 11);
  assert.ok(report.counts.marketPaths > 0);
  assert.ok(report.counts.appSitemap < report.counts.explosionIfMarketCartesian / 10);
  assert.equal(report.canonicalMismatches, 0);
  assert.equal(report.hreflang.clusters, 11);
  assert.equal(report.hreflang.broken, 0);
  assert.equal(report.hreflang.orphaned, 0);
  assert.equal(report.hreflang.duplicate, 0);
  assert.equal(report.hreflang.marketTargets, 0);
  assert.equal(report.hreflang.howItWorksOmitsSwedish, true);
  assert.equal(report.sitemapErrors.app.errors, 0);
  assert.equal(report.sitemapErrors.se.errors, 0);
  assert.equal(report.links.problemCount, 0);
  assert.deepEqual(report.links.coreOrphans, []);
  assert.equal(report.language.mixedLanguage, 0);
  assert.equal(report.legalFlags.length, 0);
  assert.equal(report.urlIssues.length, 0);
  for (const path of ['/en', '/en/ie', '/en/ca', '/nl', '/nl/nl']) {
    assert.equal(report.pilots[path].ok, true, path);
  }
  assert.equal(report.performance.precachesLocaleHtml, false);
  assert.ok(report.performance.alternatesJsBytes < 20000);
});
