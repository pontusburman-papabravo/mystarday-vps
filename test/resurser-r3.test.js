'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  R3_LONGTAIL_PAGES,
  R3_INDEXABLE_PATHS,
  R3_PDF_FILES,
  R3_DOWNLOAD_META,
  R3_RELATED_LABELS,
  r3PagePlainText,
  countSwedishWords,
} = require('../config/resurser-r3');
const { R1_INDEXABLE_PATHS } = require('../config/resurser-r1');
const { R2_INDEXABLE_PATHS } = require('../config/resurser-r2');
const { SEO_INDEXABLE_PATHS } = require('../src/lib/seo-pages');
const { buildSitemapXml } = require('../src/lib/sitemap');
const { listenApp } = require('./helpers/http');

const ROOT = path.join(__dirname, '..');
const PDF_DIR = path.join(ROOT, 'public/resurser/pdf');
const MIN_BODY_WORDS = 300;

/** Known internal link targets from R0–R2 hub, guides, and R3 pages. */
const VALID_INTERNAL_PATHS = new Set([
  '/resurser',
  '/bildschema-app',
  '/morgonrutin-barn',
  '/beloningssystem-barn',
  '/rutiner-npf-barn',
  '/veckoschema-bildstod',
  '/skattkammaren',
  ...R1_INDEXABLE_PATHS,
  ...R2_INDEXABLE_PATHS,
  ...R3_INDEXABLE_PATHS,
]);

function extractInternalHrefs(html) {
  const hrefs = [];
  const re = /href="(\/[^"#?]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (href.endsWith('.svg') || href.endsWith('.css') || href.endsWith('.js')) continue;
    hrefs.push(href);
  }
  return hrefs;
}

describe('resurser R3 — page registry', () => {
  it('ships one hundred long-tail pages', () => {
    assert.equal(R3_LONGTAIL_PAGES.length, 100);
    assert.equal(R3_INDEXABLE_PATHS.length, 102);
  });

  it('every page has unique slug and path', () => {
    const slugs = R3_LONGTAIL_PAGES.map((p) => p.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const page of R3_LONGTAIL_PAGES) {
      assert.equal(page.path, `/resurser/${page.slug}`);
      assert.equal(page.file, `resurser/${page.slug}.html`);
    }
  });

  it('every downloadSlug maps to existing PDF landing page', () => {
    for (const page of R3_LONGTAIL_PAGES) {
      assert.ok(page.downloadSlug, page.slug);
      assert.ok(R3_DOWNLOAD_META[page.downloadSlug], page.downloadSlug);
    }
  });

  it('every relatedSlug is a known internal path', () => {
    for (const page of R3_LONGTAIL_PAGES) {
      assert.ok(page.relatedSlugs.length >= 1, page.slug);
      for (const slug of page.relatedSlugs) {
        assert.ok(R3_RELATED_LABELS[slug], `${page.slug} → ${slug}`);
        assert.ok(VALID_INTERNAL_PATHS.has(slug), `${page.slug} → ${slug}`);
      }
    }
  });

  it('body copy is at least 300 words per page', () => {
    for (const page of R3_LONGTAIL_PAGES) {
      const words = countSwedishWords(r3PagePlainText(page));
      assert.ok(words >= MIN_BODY_WORDS, `${page.slug}: ${words} words`);
    }
  });

  it('HTML files exist for each indexable path', () => {
    for (const page of R3_LONGTAIL_PAGES) {
      const full = path.join(ROOT, 'public', page.file);
      assert.ok(fs.existsSync(full), page.file);
    }
  });
});

describe('resurser R3 — PDF assets', () => {
  it('ships two R3 downloadable PDFs', () => {
    assert.equal(R3_PDF_FILES.length, 2);
    for (const file of R3_PDF_FILES) {
      const full = path.join(PDF_DIR, file);
      assert.ok(fs.existsSync(full), `missing ${file}`);
      assert.ok(fs.statSync(full).size > 500, `${file} too small`);
    }
  });

  it('R3 PDF landing HTML files exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/resurser/pdf-helgschema.html')));
    assert.ok(fs.existsSync(path.join(ROOT, 'public/resurser/pdf-laxschema.html')));
  });
});

describe('resurser R3 — SEO aliases', () => {
  const { R3_ALIAS_REDIRECTS, R3_SLUG_ALIASES } = require('../config/resurser-r3-aliases');

  it('maps common {topic}schema-barn-gratis slugs to bildschema-{topic}-barn', () => {
    assert.equal(R3_SLUG_ALIASES.get('helgschema-barn-gratis'), 'bildschema-helg-barn');
    assert.equal(R3_SLUG_ALIASES.get('morgonschema-barn-gratis'), 'bildschema-morgon-barn');
  });

  it('alias redirects return 301 to canonical page', async () => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      for (const { from, to } of R3_ALIAS_REDIRECTS.slice(0, 5)) {
        const res = await fetch(`${http.baseUrl}${from}`, { redirect: 'manual' });
        assert.equal(res.status, 301, from);
        assert.equal(res.headers.get('location'), to, from);
      }
      const canonical = await fetch(`${http.baseUrl}/resurser/bildschema-helg-barn`);
      assert.equal(canonical.status, 200);
    } finally {
      await http.close();
    }
  });

  it('unknown /resurser/* returns 404 instead of redirect to home', async () => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const res = await fetch(`${http.baseUrl}/resurser/does-not-exist-xyz`, { redirect: 'manual' });
      assert.equal(res.status, 404);
    } finally {
      await http.close();
    }
  });
});

describe('resurser R3 — SEO and HTTP', () => {
  it('all R3 paths are in SEO_INDEXABLE_PATHS and sitemap', () => {
    const xml = buildSitemapXml();
    for (const p of R3_INDEXABLE_PATHS) {
      assert.equal(SEO_INDEXABLE_PATHS.has(p), true, p);
      assert.match(xml, new RegExp(`${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/loc>`), p);
    }
  });

  it('generated HTML has canonical, title, meta description and no broken internal links', () => {
    for (const page of R3_LONGTAIL_PAGES) {
      const html = fs.readFileSync(path.join(ROOT, 'public', page.file), 'utf8');
      assert.match(html, new RegExp(`rel="canonical" href="https://mystarday.se${page.path}"`), page.slug);
      assert.match(html, new RegExp(`<title>${page.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\| Min Stjärndag</title>`), page.slug);
      assert.match(html, new RegExp(`meta name="description" content="${page.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), page.slug);
      assert.match(html, /seo-article\.css/);
      assert.match(html, /article-events\.js/);
      assert.match(html, /data-track="article_cta_register"/);

      const hrefs = extractInternalHrefs(html);
      for (const href of hrefs) {
        if (href.endsWith('.pdf')) continue;
        assert.ok(VALID_INTERNAL_PATHS.has(href), `${page.slug}: broken link ${href}`);
      }
    }
  });

  it('R3 pages return HTTP 200', async () => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const sample = [
        '/resurser/bildschema-forskolan',
        '/resurser/bildstod-adhd-barn',
        '/resurser/hygienschema-barn-pdf',
        '/resurser/bildkort-rutiner-barn',
        '/resurser/bildschema-lakarbesok-barn',
        '/resurser/pdf/helgschema',
        '/resurser/pdf/laxschema',
      ];
      for (const p of sample) {
        const res = await fetch(`${http.baseUrl}${p}`);
        assert.equal(res.status, 200, p);
      }
      for (const page of R3_LONGTAIL_PAGES) {
        const res = await fetch(`${http.baseUrl}${page.path}`);
        assert.equal(res.status, 200, page.path);
      }
    } finally {
      await http.close();
    }
  });
});
