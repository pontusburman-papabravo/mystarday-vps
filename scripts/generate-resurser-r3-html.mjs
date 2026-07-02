#!/usr/bin/env node
/**
 * Generate R3 long-tail resurser HTML pages from config/resurser-r3.js
 * Usage: node scripts/generate-resurser-r3-html.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public/resurser');

const {
  R3_LONGTAIL_PAGES,
  R3_DOWNLOAD_META,
  R3_RELATED_LABELS,
} = require('../config/resurser-r3');

const HEAD_COMMON = `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/landing.css?v=7">
  <link rel="stylesheet" href="/css/seo-article.css?v=2">
  <link rel="stylesheet" href="/css/resurser-print.css?v=1">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script src="/js/cookie-banner.js?v=2.13.2"></script>`;

const TAIL = `  <script src="/js/article-events.js?v=1"></script>
  <script src="/js/sw-register.js?v=2.13.0"></script>
</body>
</html>`;

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function renderSections(sections) {
  return sections
    .map((section) => {
      const paras = (section.paragraphs || [])
        .map((p) => `    <p>${p}</p>`)
        .join('\n');
      let list = '';
      if (section.bullets?.length) {
        const items = section.bullets.map((b) => `      <li>${b}</li>`).join('\n');
        list = `\n    <ul>\n${items}\n    </ul>`;
      }
      return `    <h2>${section.h2}</h2>\n${paras}${list}`;
    })
    .join('\n\n');
}

function renderRelatedLinks(relatedSlugs) {
  const links = relatedSlugs
    .map((slug) => {
      const label = R3_RELATED_LABELS[slug] || slug;
      return `<a class="inline" href="${slug}">${label}</a>`;
    })
    .join(' · ');
  return `      <p>${links}</p>`;
}

function renderDownloadBlock(downloadSlug) {
  const meta = R3_DOWNLOAD_META[downloadSlug];
  if (!meta) return '';
  return `
    <h2>Ladda ner</h2>
    <ul class="resurser-download-list">
      <li><a href="${meta.path}">${meta.label}</a></li>
      <li><a href="${meta.pdfHref}" download>Direktlänk: PDF</a></li>
    </ul>`;
}

function writeLongtailPage(page) {
  const bodySections = renderSections(page.sections);
  const downloadBlock = renderDownloadBlock(page.downloadSlug);
  const relatedBlock = renderRelatedLinks(page.relatedSlugs);

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <link rel="canonical" href="https://mystarday.se${page.path}">
  <title>${escapeAttr(page.title)} | Min Stjärndag</title>
  <meta name="description" content="${escapeAttr(page.description)}">
  <meta property="og:title" content="${escapeAttr(page.title)}">
  <meta property="og:description" content="${escapeAttr(page.description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://mystarday.se${page.path}">
${HEAD_COMMON}
</head>
<body class="seo-article-page">
  <article class="seo-article">
    <a href="/resurser" class="back-home">← Resursbibliotek</a>
    <h1>${page.h1}</h1>
    <p class="lead">${page.lead}</p>

${bodySections}
${downloadBlock}

    <div class="seo-cta-card">
      <h3>Vill du slippa skriva ut om varje vecka?</h3>
      <p>Testa Min Stjärndag gratis — levande schema med bildstöd som barnet kan följa själv.</p>
      <a href="/register?utm_content=resurs-${page.slug}" class="btn-primary" data-track="article_cta_register">Testa Min Stjärndag gratis</a>
    </div>

    <div class="resurser-related-links">
${relatedBlock}
    </div>
  </article>
${TAIL}`;

  fs.writeFileSync(path.join(ROOT, 'public', page.file), html);
  console.log(`✓ ${page.file}`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const page of R3_LONGTAIL_PAGES) writeLongtailPage(page);
console.log(`Done — ${R3_LONGTAIL_PAGES.length} R3 long-tail pages generated`);
