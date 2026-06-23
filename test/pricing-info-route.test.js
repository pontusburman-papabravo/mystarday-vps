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
});

test('landing route serves program catalog API', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/landing.js'), 'utf8');
  assert.match(src, /router\.get\('\/api\/public\/program-catalog'/);
  assert.match(src, /getProgramCatalog/);
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
  assert.match(html, /id="grundarprogram"/);
  assert.match(html, /data-track="hero_signup_click"/);
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

test('program-catalog-render adds marketing preview links', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/program-catalog-render.js'), 'utf8');
  assert.match(src, /marketingPreviewHref/);
  assert.match(src, /previewFromContext/);
  assert.match(src, /\/pricing-info.*pricing/);
  assert.match(src, /program-interest-form/);
});

test('preview-back keeps logged-in users in app after marketing preview', () => {
  const previewBack = fs.readFileSync(path.join(ROOT, 'public/js/preview-back.js'), 'utf8');
  const shellJs = fs.readFileSync(path.join(ROOT, 'public/js/preview-shell.js'), 'utf8');
  const pricing = fs.readFileSync(path.join(ROOT, 'public/js/pricing-info.js'), 'utf8');
  assert.match(previewBack, /from === 'pricing'/);
  assert.match(previewBack, /from === 'upgrade'/);
  assert.match(previewBack, /isLoggedIn\(\)/);
  assert.match(shellJs, /PreviewBack\.apply/);
  assert.match(pricing, /Auth\.isLoggedIn/);
});

test('program-catalog-render is shared module', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/program-catalog-render.js'), 'utf8');
  const pricing = fs.readFileSync(path.join(ROOT, 'public/js/pricing-info.js'), 'utf8');
  const landing = fs.readFileSync(path.join(ROOT, 'public/js/landing-program-matrix.js'), 'utf8');
  assert.match(src, /ProgramCatalogRender/);
  assert.match(pricing, /ProgramCatalogRender/);
  assert.match(landing, /ProgramCatalogRender/);
});

test('preview-shell exports preview page paths', () => {
  const js = fs.readFileSync(path.join(ROOT, 'public/js/preview-shell.js'), 'utf8');
  assert.match(js, /PREVIEW_PAGE_PATHS/);
  assert.match(js, /getPreviewPagePath/);
  assert.match(js, /reporting: '\/reports'/);
});
