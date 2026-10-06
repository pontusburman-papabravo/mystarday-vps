'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  RESURSER_DECISION_ROWS,
  resurserDecision,
  resurserRedirectTarget,
} = require('../config/resurser-consolidation');
const {
  R3_ALIAS_REDIRECTS,
  R3_ALIAS_CHAIN_FIX_COUNT,
} = require('../config/resurser-r3-aliases');
const { SEO_INDEXABLE_PATHS, buildRobotsTxt, isSeoIndexable } = require('../src/lib/seo-pages');
const { buildSitemapXml } = require('../src/lib/sitemap');
const { createDomainRedirect, MAIN_DOMAIN, APP_DOMAIN } = require('../src/lib/domain-redirect');
const { injectPlatformHtml } = require('../src/middleware/platform-html');

const ROOT = path.join(__dirname, '..');

function rows(decision) {
  return RESURSER_DECISION_ROWS.filter((row) => row.decision === decision);
}

function swedishSitemap() {
  return buildSitemapXml({ host: MAIN_DOMAIN });
}

function sitemapHas(xml, urlPath) {
  return xml.includes(`${urlPath}</loc>`);
}

test('resurser decisions are 17 keep, 26 redirect and 83 noindex', () => {
  assert.equal(RESURSER_DECISION_ROWS.length, 126);
  assert.equal(rows('keep').length, 17);
  assert.equal(rows('redirect').length, 26);
  assert.equal(rows('noindex').length, 83);
  const resurserInSitemap = [...SEO_INDEXABLE_PATHS].filter((p) => p === '/resurser' || p.startsWith('/resurser/'));
  assert.deepEqual(resurserInSitemap.sort(), rows('keep').map((row) => row.path).sort());
});

test('kept resurser pages stay indexable and in the Swedish sitemap', () => {
  const xml = swedishSitemap();
  for (const row of rows('keep')) {
    assert.equal(isSeoIndexable(row.path), true, row.path);
    assert.equal(sitemapHas(xml, row.path), true, row.path);
    assert.equal(resurserRedirectTarget(row.path), null, row.path);
  }
  for (const pillar of ['/bildschema-app', '/morgonrutin-barn', '/veckoschema-bildstod', '/rutiner-npf-barn', '/beloningssystem-barn', '/faq']) {
    assert.equal(sitemapHas(xml, pillar), true, pillar);
  }
});

test('redirected resurser pages leave the sitemap and do not chain', () => {
  const xml = swedishSitemap();
  for (const row of rows('redirect')) {
    assert.equal(isSeoIndexable(row.path), false, row.path);
    assert.equal(sitemapHas(xml, row.path), false, row.path);
    assert.equal(resurserRedirectTarget(row.path), row.owner, row.path);
    assert.equal(resurserRedirectTarget(row.owner), null, row.owner);
    assert.notEqual(resurserDecision(row.owner), 'redirect', row.owner);
  }
});

test('noindex resurser pages stay out of the sitemap and are not crawl-blocked', () => {
  const xml = swedishSitemap();
  const robots = buildRobotsTxt({ host: MAIN_DOMAIN });
  assert.doesNotMatch(robots, /Disallow:\s*\/resurser/);
  for (const row of rows('noindex')) {
    assert.equal(isSeoIndexable(row.path), false, row.path);
    assert.equal(sitemapHas(xml, row.path), false, row.path);
    assert.equal(resurserRedirectTarget(row.path), null, row.path);
    const html = injectPlatformHtml(
      `<html><head><link rel="canonical" href="https://${MAIN_DOMAIN}${row.path}"></head><body></body></html>`,
      row.path
    );
    assert.match(html, /name="robots" content="noindex, follow"/, row.path);
    assert.match(html, new RegExp(`rel="canonical" href="https://${MAIN_DOMAIN.replace(/[.]/g, '\\.')}${row.path}"`), row.path);
  }
});

test('legacy resurser aliases skip a redirect source', () => {
  assert.ok(R3_ALIAS_CHAIN_FIX_COUNT > 0);
  for (const alias of R3_ALIAS_REDIRECTS) {
    assert.equal(resurserRedirectTarget(alias.to), null, `${alias.from} → ${alias.to}`);
    assert.notEqual(alias.to, alias.from);
  }
  const morning = R3_ALIAS_REDIRECTS.find((row) => row.from === '/resurser/morgonschema-barn-gratis');
  assert.equal(morning.to, '/resurser/morgon');
});

test('app host consolidation is one hop to the Swedish owner', () => {
  const middleware = createDomainRedirect();
  function run(url) {
    let status;
    let location;
    let nextCalled = false;
    middleware(
      { headers: { host: APP_DOMAIN }, originalUrl: url, method: 'GET' },
      { redirect(code, loc) { status = code; location = loc; } },
      () => { nextCalled = true; }
    );
    return { status, location, nextCalled };
  }
  const source = run('/resurser/morgonrutin-bildstod-pdf?utm_source=test');
  assert.equal(source.status, 301);
  assert.equal(source.location, `https://${MAIN_DOMAIN}/resurser/morgon?utm_source=test`);
  const alias = run('/resurser/morgonschema-barn-gratis');
  assert.equal(alias.status, 301);
  assert.equal(alias.location, `https://${MAIN_DOMAIN}/resurser/morgon`);
  const noindex = run('/resurser/bildschema-badhus-barn');
  assert.equal(noindex.status, 301);
  assert.equal(noindex.location, `https://${MAIN_DOMAIN}/resurser/bildschema-badhus-barn`);
  const keep = run('/resurser/morgon');
  assert.equal(keep.status, 301);
  assert.equal(keep.location, `https://${MAIN_DOMAIN}/resurser/morgon`);
});

test('homepage school links go to the school resource, not the template page', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert.doesNotMatch(html, /\/resurser\/bildschema-skolstart-hosten/);
  assert.equal(html.split('href="/resurser/skola"').length - 1, 3);
});

test('TEACCH category keeps the non-official disclaimer', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/resurser/teacch-inspirerat.html'), 'utf8');
  assert.match(html, /TEACCH-inspirerat/);
  assert.match(html, /inte<\/strong> officiell TEACCH-metod/);
  assert.match(html, /eller en TEACCH-intervention/);
  assert.match(html, /fristående utskriftsmaterial/);
});

test('resource hub visibly owns printable picture schedules', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/resurser.html'), 'utf8');
  assert.match(html, /gratis bildscheman, bildstöd och utskrivbara PDF-mallar/);
});

test('consolidation HTTP responses match the decision table', async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }
  const { createApp } = require('../app');
  const { listenApp } = require('./helpers/http');
  const http = await listenApp(createApp);
  try {
    for (const row of RESURSER_DECISION_ROWS) {
      const res = await fetch(`${http.baseUrl}${row.path}`, { redirect: 'manual' });
      if (row.decision === 'redirect') {
        assert.equal(res.status, 301, row.path);
        assert.equal(res.headers.get('location'), row.owner, row.path);
        continue;
      }
      assert.equal(res.status, 200, row.path);
      const body = await res.text();
      if (row.decision === 'noindex') {
        assert.match(body, /name="robots" content="noindex, follow"/, row.path);
      } else {
        assert.doesNotMatch(body, /name="robots" content="noindex/, row.path);
      }
      assert.match(body, new RegExp(`rel="canonical" href="https://[^"]+${row.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), row.path);
    }
    const pdf = await fetch(`${http.baseUrl}/resurser/pdf/morgonschema.pdf`);
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers.get('content-type') || '', /pdf/i);
  } finally {
    await http.close();
  }
});
