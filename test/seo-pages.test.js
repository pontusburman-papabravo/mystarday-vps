'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { injectPlatformHtml } = require('../src/middleware/platform-html');
const {
  isSeoIndexable,
  injectNoindexMeta,
  SEO_INDEXABLE_PATHS,
} = require('../src/lib/seo-pages');

const ROOT = path.join(__dirname, '..');

test('SEO indexable paths include public marketing pages', () => {
  for (const p of ['/', '/register', '/skattkammaren', '/pricing-info', '/pedagoger-och-terapeuter', '/faq', '/kontakt']) {
    assert.ok(SEO_INDEXABLE_PATHS.has(p), p);
    assert.equal(isSeoIndexable(p), true);
  }
});

test('login and dashboard paths are not SEO indexable', () => {
  for (const p of ['/login', '/dashboard', '/schedule', '/child-login']) {
    assert.equal(isSeoIndexable(p), false);
  }
});

test('injectNoindexMeta adds robots noindex on login', () => {
  const html = '<!DOCTYPE html><html><head><title>Logga in</title></head><body></body></html>';
  const out = injectNoindexMeta(html, '/login');
  assert.match(out, /name="robots" content="noindex"/);
});

test('injectNoindexMeta skips indexable register page', () => {
  const html = '<!DOCTYPE html><html><head><title>Reg</title></head><body></body></html>';
  const out = injectNoindexMeta(html, '/register');
  assert.doesNotMatch(out, /noindex/);
});

test('injectPlatformHtml applies noindex on dashboard', () => {
  const html = '<!DOCTYPE html><html><head></head><body></body></html>';
  const out = injectPlatformHtml(html, '/dashboard');
  assert.match(out, /name="robots" content="noindex"/);
});

test('index.html has canonical and no hidden SEO text', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert.match(html, /rel="canonical" href="\/"/);
  assert.doesNotMatch(html, /font-size:0;color:transparent/);
  assert.doesNotMatch(html, /Hidden SEO/);
});

test('register.html has unique meta description and hero copy', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/register.html'), 'utf8');
  assert.match(html, /<title>Skapa konto \|/);
  assert.match(html, /meta name="description"/);
  assert.match(html, /visuellt schema med bildstöd/);
  assert.match(html, /<h1[^>]*>Skapa ett föräldrakonto<\/h1>/);
});

test('sitemap reflects index strategy', () => {
  const xml = fs.readFileSync(path.join(ROOT, 'public/sitemap.xml'), 'utf8');
  assert.match(xml, /\/pricing-info<\/loc>/);
  assert.match(xml, /\/faq<\/loc>/);
  assert.match(xml, /\/kontakt<\/loc>/);
  assert.doesNotMatch(xml, /\/login<\/loc>/);
  assert.doesNotMatch(xml, /\/child-login<\/loc>/);
  assert.match(xml, /<lastmod>2026-06-22<\/lastmod>/);
});

test('faq and kontakt pages are indexable with canonical', () => {
  const faq = fs.readFileSync(path.join(ROOT, 'public/faq.html'), 'utf8');
  const kontakt = fs.readFileSync(path.join(ROOT, 'public/kontakt.html'), 'utf8');
  assert.match(faq, /rel="canonical" href="\/faq"/);
  assert.match(faq, /"@type": "FAQPage"/);
  assert.match(kontakt, /rel="canonical" href="\/kontakt"/);
  assert.equal(isSeoIndexable('/faq'), true);
  assert.equal(isSeoIndexable('/kontakt'), true);
});

test('pricing-info is public access information page', () => {
  const route = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
  assert.doesNotMatch(route, /isBillingUiEnabled/);
  const html = fs.readFileSync(path.join(ROOT, 'public/pricing-info.html'), 'utf8');
  assert.match(html, /Så fungerar tillgången till/); // pragma: allowlist secret
  assert.match(html, /Apple App Store/);
  assert.match(html, /href="\/skattkammaren"/);
});

test('skattkammaren has expanded SEO content sections', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/skattkammaren.html'), 'utf8');
  assert.match(html, /belöningssystem som stärker motivation/);
  assert.match(html, /Vad är Skattkammaren\?/);
  assert.match(html, /Schema \+ bildstöd \+ motivation/);
});

test('landing problem and solution sections mention routines and skattkammaren link', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert.match(html, /morgonrutiner som havererar/);
  assert.match(html, /Barnet ser vad som ska hända/);
  assert.match(html, /href="\/skattkammaren"/);
});
