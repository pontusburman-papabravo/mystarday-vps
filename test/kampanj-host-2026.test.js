'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'public/kampanj-host-2026.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
const landingJs = fs.readFileSync(path.join(ROOT, 'src/routes/landing.js'), 'utf8');
const {
  isSeoIndexable,
  SEO_CRAWL_DISALLOW_PATHS,
  SEO_INDEXABLE_PATHS,
} = require('../src/lib/seo-pages');
const { APPLE_APP_STORE_SHORT_URL, getPlayStoreUrl } = require('../config/store-links');

const FORBIDDEN = [
  /gratis i 1 år/i,
  /1 år gratis/i,
  /livstid/i,
  /permanent/i,
  /14 dagar/i,
  /countdown/i,
  /Conversions API/i,
];

test('campaign page has exact allowed copy and no forbidden claims', () => {
  assert.match(html, /<h1>Mindre tjat\. Mer koll på dagen\.<\/h1>/);
  assert.match(html, /Premium i ett år om du registrerar dig senast 30 september\./);
  assert.doesNotMatch(html, /Premium ingår om du registrerar/);
  assert.match(html, /hjälper barnet att se vad som händer nu, vad som kommer sedan och vad som redan är klart\./);
  assert.match(html, /Utvecklad med NPF-familjer i åtanke, men passar också andra barn som mår bra av tydlighet, struktur och förutsägbarhet\./);
  assert.match(html, /Hundratals familjer använder redan/);
  assert.match(html, /Finns för iPhone och Android\./);
  assert.match(html, />Hämta på App Store</);
  assert.match(html, />Ladda ned på Google Play</);
  assert.match(html, /id="kampanjSurveyTitle"/);
  assert.match(html, /Hjälp oss göra .+ bättre/);
  assert.match(html, /Svara på enkäten/);
  assert.match(html, /href="\/tyck\/host-2026"/);
  assert.match(html, /href="\/kampanj\/host-2026\/utlottning"/);
  assert.doesNotMatch(html, /VINN 500/i);
  for (const re of FORBIDDEN) {
    assert.doesNotMatch(html, re);
  }
});

test('campaign page uses existing store placeholders, tracking, and screenshots', () => {
  assert.match(html, /href="__APPLE_STORE_URL__"/);
  assert.match(html, /href="__PLAY_STORE_URL__"/);
  assert.match(html, /data-track="app_store_click"/);
  assert.match(html, /data-track="play_store_click"/);
  assert.match(html, /\/js\/landing-events\.js/);
  assert.match(html, /\/js\/utm-capture\.js/);
  assert.match(html, /\/js\/marketing-events\.js/);
  assert.doesNotMatch(html, /landing-login-choice/);
  assert.match(html, /vardagsrutiner-bildstod\.png/);
  assert.match(html, /morgonschema-bildstod\.png/);
  assert.match(html, /stjarnor-beloningssystem\.png/);
  assert.match(html, /\/api\/landing\/stats/);
});

test('campaign route injects existing store URLs and skips landing login-choice', () => {
  assert.match(landingJs, /router\.get\('\/kampanj\/host-2026'/);
  assert.match(landingJs, /kampanj-host-2026\.html/);
  assert.match(landingJs, /APPLE_APP_STORE_SHORT_URL/);
  assert.match(landingJs, /__APPLE_STORE_URL__/);
  assert.equal(APPLE_APP_STORE_SHORT_URL, 'https://apple.co/4v2ESuH');
  assert.match(getPlayStoreUrl(), /play\.google\.com\/store\/apps\/details\?id=/);
});

test('campaign page is not SEO-indexable', () => {
  assert.equal(isSeoIndexable('/kampanj/host-2026'), false);
  assert.equal(SEO_INDEXABLE_PATHS.has('/kampanj/host-2026'), false);
  assert.ok(SEO_CRAWL_DISALLOW_PATHS.includes('/kampanj'));
});

test('Google Ads bots are allowed to crawl /kampanj', () => {
  const { ADSBOT_USER_AGENTS, buildRobotsTxt } = require('../src/lib/seo-pages');
  const txt = buildRobotsTxt();
  for (const agent of ADSBOT_USER_AGENTS) {
    assert.match(txt, new RegExp(`User-agent: ${agent}\\nAllow: /kampanj`));
  }
});

test('homepage has isolated removable campaign CTA', () => {
  assert.match(indexHtml, /CAMPAIGN host-2026: remove after 2026-09-30/);
  assert.match(indexHtml, /Premium i ett år om du registrerar dig senast 30 september/);
  assert.doesNotMatch(indexHtml, /Premium ingår om du registrerar/);
  assert.match(indexHtml, />Se erbjudandet</);
  assert.match(indexHtml, /href="\/kampanj\/host-2026"/);
  assert.match(indexHtml, /utm_source/);
  assert.doesNotMatch(indexHtml, /countdown/i);
  for (const re of FORBIDDEN) {
    const offerBlock = indexHtml.slice(
      indexHtml.indexOf('CAMPAIGN host-2026'),
      indexHtml.indexOf('/CAMPAIGN host-2026')
    );
    assert.doesNotMatch(offerBlock, re);
  }
});

test('GET /kampanj/host-2026 serves campaign HTML with store links', async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }
  const { createApp } = require('../app');
  const { listenApp } = require('./helpers/http');
  const http = await listenApp(createApp);
  try {
    const res = await fetch(`${http.baseUrl}/kampanj/host-2026`);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /Premium i ett år om du registrerar dig senast 30 september\./);
    assert.match(body, /Svara på enkäten/);
    assert.match(body, /\/tyck\/host-2026/);
    assert.match(body, /https:\/\/apple\.co\/4v2ESuH/);
    assert.match(body, /play\.google\.com\/store\/apps\/details\?id=/);
    assert.match(body, /\/js\/marketing-events\.js/);
    assert.doesNotMatch(body, /landing-login-choice/);
    assert.match(body, /noindex/);
  } finally {
    await http.close();
  }
});
