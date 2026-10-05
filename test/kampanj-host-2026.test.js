'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
const landingJs = fs.readFileSync(path.join(ROOT, 'src/routes/landing.js'), 'utf8');
const landingCss = fs.readFileSync(path.join(ROOT, 'public/css/landing.css'), 'utf8');
const { SEO_CRAWL_DISALLOW_PATHS, SEO_INDEXABLE_PATHS, buildRobotsTxt } = require('../src/lib/seo-pages');

test('höst 2026 campaign pages are gone', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'public/kampanj-host-2026.html')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'public/kampanj-host-2026-utlottning.html')), false);
  assert.doesNotMatch(landingJs, /serveCampaignHtml/);
  assert.doesNotMatch(landingJs, /kampanj-host-2026\.html/);
  assert.doesNotMatch(landingCss, /body\.kampanj-host-2026/);
  assert.doesNotMatch(landingCss, /CAMPAIGN host-2026/);
});

test('expired campaign URLs redirect away from the campaign', () => {
  assert.match(landingJs, /router\.get\('\/kampanj\/host-2026', \(req, res\) => \{\s*res\.redirect\(301, '\/'\)/);
  assert.match(landingJs, /router\.get\('\/kampanj\/host-2026\/utlottning', \(req, res\) => \{\s*res\.redirect\(301, '\/privacy'\)/);
  assert.equal(SEO_INDEXABLE_PATHS.has('/kampanj/host-2026'), false);
  assert.equal(SEO_CRAWL_DISALLOW_PATHS.includes('/kampanj'), false);
  assert.doesNotMatch(buildRobotsTxt(), /\/kampanj/);
});

test('homepage states the 3 Oct trial instead of the expired September year offer', () => {
  assert.match(indexHtml, /14 dagar gratis från 3 oktober/);
  assert.match(indexHtml, /Därefter väljer ni abonnemang i appen/);
  assert.doesNotMatch(indexHtml, /Premium i ett år om du registrerar dig senast 30 september/);
  assert.doesNotMatch(indexHtml, /CAMPAIGN host-2026/);
  assert.doesNotMatch(indexHtml, /countdown/i);
  assert.doesNotMatch(indexHtml, /Basic ingår utan kostnad/);
  assert.doesNotMatch(indexHtml, /\/kampanj\/host-2026/);
});

test('GET /kampanj/host-2026 redirects home and the lottery terms redirect to privacy', async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }
  const { createApp } = require('../app');
  const { listenApp } = require('./helpers/http');
  const http = await listenApp(createApp);
  try {
    const campaign = await fetch(`${http.baseUrl}/kampanj/host-2026`, { redirect: 'manual' });
    assert.equal(campaign.status, 301);
    assert.equal(campaign.headers.get('location'), '/');

    const terms = await fetch(`${http.baseUrl}/kampanj/host-2026/utlottning`, { redirect: 'manual' });
    assert.equal(terms.status, 301);
    assert.equal(terms.headers.get('location'), '/privacy');

    const gone = await fetch(`${http.baseUrl}/kampanj-host-2026.html`, { redirect: 'manual' });
    assert.notEqual(gone.status, 200);
  } finally {
    await http.close();
  }
});
