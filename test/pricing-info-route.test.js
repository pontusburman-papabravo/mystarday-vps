'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('public route serves kontakt and faq pages', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
  assert.match(src, /router\.get\('\/kontakt'/);
  assert.match(src, /kontakt\.html/);
  assert.match(src, /router\.get\('\/faq'/);
  assert.match(src, /faq\.html/);
  assert.match(src, /router\.get\('\/om-oss'/);
  assert.match(src, /om-oss\.html/);
});

test('landing route serves program catalog API', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/landing.js'), 'utf8');
  assert.match(src, /router\.get\('\/api\/public\/program-catalog'/);
  assert.match(src, /getProgramCatalog/);
});

test('landing index injects Play Store URL placeholder', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/landing.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert.match(src, /injectStoreLinks/);
  assert.match(src, /injectSiteUrl/);
  assert.match(html, /__PLAY_STORE_URL__/);
  assert.match(html, /__SITE_URL__/);
  assert.match(html, /google-play-badge-sv\.svg/);
  assert.match(html, /app-store-badge-sv\.svg/);
});

test('store badge SVG uses HTML entity for ä in Hämta', () => {
  const app = fs.readFileSync(path.join(ROOT, 'public/img/app-store-badge-sv.svg'), 'utf8');
  const play = fs.readFileSync(path.join(ROOT, 'public/img/google-play-badge-sv.svg'), 'utf8');
  assert.match(app, /H&#228;mta i/);
  assert.match(play, /H&#228;mta i/);
  assert.doesNotMatch(app, /Hämta i/);
});

test('landing index injects inline store badge SVGs', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/landing.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert.match(src, /injectStoreBadgeSvgs/);
  assert.match(html, /app-store-badge-sv\.svg/);
  assert.match(html, /google-play-badge-sv\.svg/);
});

test('landing mobile login choice script is wired on index', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'public/js/landing-login-choice.js'), 'utf8');
  assert.match(html, /landing-login-choice\.js/);
  assert.match(js, /landing_login_entry_choice_v1/);
  assert.match(js, /\/register/);
  assert.match(js, /Fråga inte igen/);
});

test('program catalog has five programs with total and pedagog last', () => {
  const catalog = require('../config/program-catalog');
  const data = catalog.getProgramCatalog();

  assert.equal(data.programs.length, 5);
  assert.ok(data.programs.some((p) => p.component === 'basic_app'));
  assert.ok(data.programs.some((p) => p.component === 'reporting'));
  assert.ok(data.programs.some((p) => p.component === 'total'));
  assert.equal(data.programs[data.programs.length - 1].component, 'pedagog');
  assert.ok(data.comparison.rows.length >= 6);
  assert.deepEqual(data.public_interest_components, ['reporting', 'pedagog', 'teacch', 'total']);
  assert.match(data.copy.intro, /Basic/);
  assert.doesNotMatch(data.copy.founder_note, /platser kvar/i);
});

test('pricing-info page is public access information (not gated catalog)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/pricing-info.html'), 'utf8');
  const route = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');

  assert.match(route, /router\.get\('\/pricing-info'/);
  assert.match(route, /pricing-info\.html/);
  assert.doesNotMatch(route, /isBillingUiEnabled/);
  assert.match(html, /Apple App Store och Google Play/);
  assert.match(html, /href="\/register"/);
});

test('upgrade page links to program info', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/upgrade.html'), 'utf8');
  assert.match(html, /href="\/pricing-info"/);
  assert.match(html, /programmen/i);
});

test('upgrade packages link to preview pages instead of direct interest', () => {
  const js = fs.readFileSync(path.join(ROOT, 'public/js/upgrade-packages.js'), 'utf8');
  assert.match(js, /getPreviewPagePath/);
  assert.match(js, /Se förhandsvisning/);
  assert.match(js, /showCta:\s*false/);
  assert.doesNotMatch(js, /\/api\/subscription\/interest/);
});

test('landing page links to pricing-info and skattkammaren demo', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert.match(html, /href="\/skattkammaren\?demo=1"/);
  assert.match(html, /href="\/pricing-info"/);
  assert.doesNotMatch(html, /id="landingMatrixBody"/);
  assert.doesNotMatch(html, /landing-program-matrix\.js/);
  assert.match(html, /id="sa-fungerar-det"/);
  assert.match(html, /id="pris-och-tillgang"/);
  assert.match(html, /data-track="hero_signup_click"/);
  assert.match(html, /href="\/child-login"/);
  assert.match(html, /landing-login-entry/);
  assert.match(html, /Logga in som barn/);
  assert.match(html, /landing-nav__lang-label">English</);
});

test('English landing mirrors Swedish layout with EN waitlist funnel', () => {
  const en = fs.readFileSync(path.join(ROOT, 'public/en.html'), 'utf8');
  const landingJs = fs.readFileSync(path.join(ROOT, 'src/routes/landing.js'), 'utf8');
  assert.match(en, /<html lang="en">/);
  assert.match(en, /rel="canonical" href="__SITE_URL__\/en"/);
  assert.match(en, /hreflang="x-default"/);
  assert.match(en, /landing\.css/);
  assert.match(en, /My Starday/);
  assert.match(en, /landing-nav__lang-label">Svenska</);
  assert.match(en, /href="\/en\/faq"/);
  assert.match(en, /href="#waitlist"/);
  assert.match(en, /id="waitlist"/);
  assert.match(en, /waitlist-form/);
  assert.match(landingJs, /serveLandingHtml\(res, 'en\.html'\)/);
  assert.match(landingJs, /injectStoreLinks/);
  assert.doesNotMatch(landingJs, /engelsk_landingssida/);
});

test('guest preview scripts and marketing back navigation', () => {
  const reportsHtml = fs.readFileSync(path.join(ROOT, 'public/reports.html'), 'utf8');
  const previewBack = fs.readFileSync(path.join(ROOT, 'public/js/preview-back.js'), 'utf8');
  const previewGuest = fs.readFileSync(path.join(ROOT, 'public/js/preview-guest.js'), 'utf8');
  const reportsJs = fs.readFileSync(path.join(ROOT, 'public/js/reports.js'), 'utf8');
  const shellJs = fs.readFileSync(path.join(ROOT, 'public/js/preview-shell.js'), 'utf8');

  assert.match(reportsHtml, /preview-back\.js/);
  assert.match(reportsHtml, /preview-guest\.js/);
  assert.match(reportsHtml, /previewBackLink/);
  assert.match(previewBack, /isMarketingVisit/);
  assert.match(previewGuest, /\/api\/public\/newsletter-subscribe/);
  assert.match(reportsJs, /takeOverPublicPage/);
  assert.match(shellJs, /mountPublicPreview/);
  assert.match(shellJs, /takeOverPublicPage/);
});

test('preview-back keeps logged-in users in app after marketing preview', () => {
  const previewBack = fs.readFileSync(path.join(ROOT, 'public/js/preview-back.js'), 'utf8');
  const shellJs = fs.readFileSync(path.join(ROOT, 'public/js/preview-shell.js'), 'utf8');
  assert.match(previewBack, /from === 'pricing'/);
  assert.match(previewBack, /from === 'upgrade'/);
  assert.match(previewBack, /isLoggedIn\(\)/);
  assert.match(shellJs, /PreviewBack\.apply/);
});

test('preview-shell exports preview page paths', () => {
  const js = fs.readFileSync(path.join(ROOT, 'public/js/preview-shell.js'), 'utf8');
  assert.match(js, /PREVIEW_PAGE_PATHS/);
  assert.match(js, /getPreviewPagePath/);
  assert.match(js, /reporting: '\/reports'/);
});
