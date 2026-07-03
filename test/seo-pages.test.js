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
const { buildSitemapXml } = require('../src/lib/sitemap');
const {
  RESURSER_CATEGORIES,
  categoryPath,
  registerUtmPath,
} = require('../config/resurser-pages');
const { R2_INDEXABLE_PATHS } = require('../config/resurser-r2');
const { listenApp } = require('./helpers/http');

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

test('index.html has absolute canonical and no hidden SEO text', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert.match(html, /rel="canonical" href="https:\/\/mystarday\.se\/"/);
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
  const xml = buildSitemapXml();
  assert.match(xml, /\/pricing-info<\/loc>/);
  assert.match(xml, /\/faq<\/loc>/);
  assert.match(xml, /\/kontakt<\/loc>/);
  assert.doesNotMatch(xml, /\/login<\/loc>/);
  assert.doesNotMatch(xml, /\/child-login<\/loc>/);
  assert.match(xml, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
});

test('faq and kontakt pages are indexable with canonical', () => {
  const faq = fs.readFileSync(path.join(ROOT, 'public/faq.html'), 'utf8');
  const kontakt = fs.readFileSync(path.join(ROOT, 'public/kontakt.html'), 'utf8');
  assert.match(faq, /rel="canonical" href="https:\/\/mystarday\.se\/faq"/);
  assert.match(faq, /"@type": "FAQPage"/);
  assert.match(kontakt, /rel="canonical" href="https:\/\/mystarday\.se\/kontakt"/);
  assert.equal(isSeoIndexable('/faq'), true);
  assert.equal(isSeoIndexable('/kontakt'), true);
});

function parseFirstLdJson(html) {
  const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, 'expected JSON-LD script block');
  return JSON.parse(match[1]);
}

test('faq and pedagoger JSON-LD blocks parse as valid JSON', () => {
  const faq = parseFirstLdJson(fs.readFileSync(path.join(ROOT, 'public/faq.html'), 'utf8'));
  assert.equal(faq['@type'], 'FAQPage');
  assert.ok(Array.isArray(faq.mainEntity) && faq.mainEntity.length > 0);

  const pedagog = parseFirstLdJson(fs.readFileSync(path.join(ROOT, 'public/pedagoger-och-terapeuter.html'), 'utf8'));
  assert.equal(pedagog['@context'], 'https://schema.org');
  assert.ok(Array.isArray(pedagog['@graph']) && pedagog['@graph'].length >= 2);
  assert.equal(pedagog['@graph'][0]['@type'], 'WebPage');
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
  assert.match(html, /href="\/skattkammaren\?demo=1"/);
  assert.match(html, /href="\/resurser"/);
});

test('bildschema-app cornerstone has hub sections, FAQ, guides and tracking', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/bildschema-app.html'), 'utf8');
  assert.match(html, /rel="canonical" href="https:\/\/mystarday\.se\/bildschema-app"/);
  assert.match(html, /Vad är ett bildschema\?/);
  assert.match(html, /Varför fungerar bildstöd\?/);
  assert.match(html, /Vilka barn har nytta av bildschema\?/);
  assert.match(html, /Exempel på bildscheman/);
  assert.match(html, /Bildschema i app eller på papper\?/);
  assert.match(html, /Hur fungerar Min Stjärndag\?/);
  assert.match(html, /Relaterade guider/);
  assert.match(html, /"@type": "FAQPage"/);
  assert.match(html, /seo-article\.css/);
  assert.match(html, /article-events\.js/);
  assert.match(html, /href="\/resurser"/);
  assert.match(html, /data-track="article_cta_register"/);
  assert.match(html, /utm_content=guide-bildschema-app/);
  assert.match(html, /href="\/morgonrutin-barn"/);
  assert.match(html, /href="\/beloningssystem-barn"/);
  assert.match(html, /href="\/rutiner-npf-barn"/);
  assert.match(html, /href="\/alternativ-bildschema-tavla"/);
  assert.match(html, /href="\/veckoschema-bildstod"/);
});

test('veckoschema-bildstod is indexable with route and sitemap entry', () => {
  assert.equal(isSeoIndexable('/veckoschema-bildstod'), true);
  const route = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
  assert.match(route, /\/veckoschema-bildstod/);
  const html = fs.readFileSync(path.join(ROOT, 'public/veckoschema-bildstod.html'), 'utf8');
  assert.match(html, /rel="canonical" href="https:\/\/mystarday\.se\/veckoschema-bildstod"/);
  assert.match(html, /seo-article\.css/);
  const xml = buildSitemapXml();
  assert.match(xml, /\/veckoschema-bildstod<\/loc>/);
});

test('resurser hub is indexable with route, sitemap and CTA UTM', () => {
  assert.equal(isSeoIndexable('/resurser'), true);
  assert.ok(SEO_INDEXABLE_PATHS.has('/resurser'));
  const route = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
  assert.match(route, /router\.get\('\/resurser'/);
  assert.match(route, /resurser\.html/);
  const html = fs.readFileSync(path.join(ROOT, 'public/resurser.html'), 'utf8');
  assert.match(html, /rel="canonical" href="https:\/\/mystarday\.se\/resurser"/);
  assert.match(html, /seo-article\.css/);
  assert.match(html, /utm_content=resurs-hub/);
  assert.match(html, /href="\/resurser\/morgon"/);
  assert.match(html, /href="\/resurser\/kanslor"/);
  assert.match(html, /href="\/resurser\/pdf\/beloningsschema"/);
  const xml = buildSitemapXml();
  assert.match(xml, /\/resurser<\/loc>/);
  assert.match(xml, /\/resurser\/morgon<\/loc>/);
  assert.match(xml, /\/resurser\/pdf\/morgonschema<\/loc>/);
  assert.match(xml, /\/resurser\/kanslor<\/loc>/);
  assert.match(xml, /\/resurser\/pdf\/veckoschema<\/loc>/);
});

test('resurser registry documents category URL conventions', () => {
  assert.equal(RESURSER_CATEGORIES.length, 7);
  assert.equal(categoryPath('morgon'), '/resurser/morgon');
  assert.equal(registerUtmPath('morgon'), '/register?utm_content=resurs-morgon');
  assert.equal(registerUtmPath(), '/register?utm_content=resurs-hub');
});

test('R1 resurser pages return 200 and PDF files are served', async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    for (const p of ['/resurser/morgon', '/resurser/pdf/morgonschema', '/resurser/bildkort/morgon']) {
      const res = await fetch(`${http.baseUrl}${p}`);
      assert.equal(res.status, 200, p);
    }
    const pdf = await fetch(`${http.baseUrl}/resurser/pdf/morgonschema.pdf`);
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers.get('content-type') || '', /pdf/i);
  } finally {
    await http.close();
  }
});

test('morgonrutin guide links to morgonschema PDF', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/morgonrutin-barn.html'), 'utf8');
  assert.match(html, /href="\/resurser\/pdf\/morgonschema"/);
});

test('beloning guide links to beloningsschema PDF', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/beloningssystem-barn.html'), 'utf8');
  assert.match(html, /href="\/resurser\/pdf\/beloningsschema"/);
});

test('rutiner-npf guide links to overgangar bildkort', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/rutiner-npf-barn.html'), 'utf8');
  assert.match(html, /href="\/resurser\/bildkort\/overgangar"/);
});

test('veckoschema guide links to veckoschema PDF', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/veckoschema-bildstod.html'), 'utf8');
  assert.match(html, /href="\/resurser\/pdf\/veckoschema"/);
});

test('R2 resurser pages are indexable and return 200', async () => {
  for (const p of R2_INDEXABLE_PATHS) {
    assert.equal(isSeoIndexable(p), true, p);
    assert.ok(SEO_INDEXABLE_PATHS.has(p), p);
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    for (const p of [
      '/resurser/kanslor',
      '/resurser/bildkort/overgangar',
      '/resurser/pdf/beloningsschema',
      '/resurser/pdf/veckoschema',
    ]) {
      const res = await fetch(`${http.baseUrl}${p}`);
      assert.equal(res.status, 200, p);
    }
    const pdf = await fetch(`${http.baseUrl}/resurser/pdf/beloningsschema.pdf`);
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers.get('content-type') || '', /pdf/i);
  } finally {
    await http.close();
  }
});

test('GET /resurser returns 200', async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const res = await fetch(`${http.baseUrl}/resurser`);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /Gratis resurser/);
  } finally {
    await http.close();
  }
});

test('landing page has guide cards block with tracking', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert.match(html, /Läs våra guider/);
  assert.match(html, /data-track="landing_guide_card_click"/);
  assert.match(html, /href="\/bildschema-app"/);
  assert.match(html, /href="\/veckoschema-bildstod"/);
});

test('SEO indexable HTML pages use absolute canonical URLs', () => {
  const pageFiles = {
    '/': 'public/index.html',
    '/faq': 'public/faq.html',
    '/kontakt': 'public/kontakt.html',
    '/pricing-info': 'public/pricing-info.html',
    '/skattkammaren': 'public/skattkammaren.html',
    '/bildschema-app': 'public/bildschema-app.html',
    '/beloningssystem-barn': 'public/beloningssystem-barn.html',
    '/morgonrutin-barn': 'public/morgonrutin-barn.html',
    '/rutiner-npf-barn': 'public/rutiner-npf-barn.html',
    '/alternativ-bildschema-tavla': 'public/alternativ-bildschema-tavla.html',
    '/veckoschema-bildstod': 'public/veckoschema-bildstod.html',
    '/resurser': 'public/resurser.html',
    '/resurser/morgon': 'public/resurser/morgon.html',
    '/resurser/pdf/morgonschema': 'public/resurser/pdf-morgonschema.html',
    '/resurser/kanslor': 'public/resurser/kanslor.html',
    '/resurser/pdf/beloningsschema': 'public/resurser/pdf-beloningsschema.html',
    '/resurser/pdf/veckoschema': 'public/resurser/pdf-veckoschema.html',
  };
  for (const [p, file] of Object.entries(pageFiles)) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const loc = p === '/' ? 'https://mystarday.se/' : `https://mystarday.se${p}`;
    assert.match(html, new RegExp(`rel="canonical" href="${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), p);
  }
});

test('llms.txt is available for AI agents', () => {
  const txt = fs.readFileSync(path.join(ROOT, 'public/llms.txt'), 'utf8');
  assert.match(txt, /^# Min Stjärndag\n> /m);
  assert.match(txt, /\[Bildschema för barn\]\(https:\/\/mystarday\.se\/bildschema-app\):/);
  assert.match(txt, /\[XML-sitemap\]\(https:\/\/mystarday\.se\/sitemap\.xml\):/);
  assert.doesNotMatch(txt, /^- https:\/\//m);
});

test('SEO guide analytics events are allowlisted', () => {
  const analytics = fs.readFileSync(path.join(ROOT, 'src/routes/analytics.js'), 'utf8');
  for (const ev of ['article_cta_register', 'guide_next_step_click', 'guide_hub_nav_click', 'article_faq_expand', 'landing_guide_card_click']) {
    assert.match(analytics, new RegExp(`'${ev}'`));
  }
});

test('SEO guides ship local marketing images for Google Image Search', () => {
  const marketingDir = path.join(ROOT, 'public/images/marketing-seo');
  const files = [
    'fardiga-scheman-bildstod.png',
    'morgonschema-bildstod.png',
    'kvallsschema-bildstod.png',
    'stjarnor-beloningssystem.png',
    'vardagsrutiner-bildstod.png',
  ];
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(marketingDir, file)), `missing ${file}`);
  }
  const guideImages = {
    'public/bildschema-app.html': ['fardiga-scheman-bildstod', 'morgonschema-bildstod'],
    'public/beloningssystem-barn.html': ['stjarnor-beloningssystem'],
    'public/rutiner-npf-barn.html': ['kvallsschema-bildstod'],
    'public/morgonrutin-barn.html': ['vardagsrutiner-bildstod'],
    'public/veckoschema-bildstod.html': ['fardiga-scheman-bildstod'],
  };
  for (const [file, slugs] of Object.entries(guideImages)) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const slug of slugs) {
      assert.match(html, new RegExp(`/images/marketing-seo/${slug}\\.png`), `${file} should reference ${slug}`);
    }
    assert.match(html, /loading="lazy"/);
    assert.match(html, /alt="[^"]{20,}"/);
  }
});
