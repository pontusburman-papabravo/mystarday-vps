'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('public route serves /pricing-info', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'src/routes/public-pages.js'),
    'utf8'
  );
  assert.match(src, /router\.get\('\/pricing-info'/);
  assert.match(src, /pricing-info\.html/);
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

test('pricing-info page uses program catalog (no scarcity counter)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/pricing-info.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'public/js/pricing-info.js'), 'utf8');

  assert.match(html, /program-catalog\.css/);
  assert.match(html, /program-catalog-render\.js/);
  assert.match(html, /comparisonMatrix/);
  assert.doesNotMatch(html, /counterMain/);
  assert.doesNotMatch(html, /founderLimitLabel/);
  assert.match(js, /\/api\/public\/program-catalog/);
  assert.doesNotMatch(js, /spots_remaining/);
  assert.doesNotMatch(js, /platser kvar/);
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

test('landing page has program matrix section', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert.match(html, /id="program"/);
  assert.match(html, /landingMatrixBody/);
  assert.match(html, /landing-program-matrix\.js/);
  assert.match(html, /program-catalog-render\.js/);
  assert.match(html, /landingNewsletterForm/);
  assert.match(html, /landing-newsletter\.js/);
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
  assert.match(src, /from=landing/);
  assert.match(src, /program-interest-form/);
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
