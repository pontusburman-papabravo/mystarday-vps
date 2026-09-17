#!/usr/bin/env node
/**
 * Generate core resource-library HTML (hub, categories, picture cards, PDF landings)
 * for sv-SE and en-GB from the catalog + i18n bundles.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

const {
  LOCALES,
  CATEGORIES,
  BILDKORT_PAGES,
  PDF_LANDINGS,
  HUB,
  pdfById,
  pdfPublicPath,
  categoryById,
  landingById,
} = require('../config/resurser-catalog');
const { loadResurserI18n } = require('../src/lib/resurser-i18n');
const { publicSvgPathForKey } = require('../src/lib/resurser-icons');
const { pictogramLabel } = require('../src/lib/resurser-i18n');

const CSS_V = '2';
const ARTICLE_EVENTS_V = '2';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rich(value) {
  return escapeHtml(value)
    .replace(/&lt;strong&gt;/g, '<strong>')
    .replace(/&lt;\/strong&gt;/g, '</strong>');
}

function abs(urlPath, _locale) {
  return `__SITE_URL__${urlPath}`;
}

function localePath(sv, en, locale) {
  return locale === 'en-GB' ? en : sv;
}

function registerHref(slug) {
  return `/register?utm_content=resurs-${slug}`;
}

function head({ locale, t, title, description, pathSv, pathEn, extraCss }) {
  const lang = t.meta.htmlLang;
  const canonicalPath = locale === 'en-GB' ? pathEn : pathSv;
  const brand = t.meta.brand;
  const langSwitcher = locale === 'en-GB'
    ? '\n  <script src="/js/public-lang-switcher.js?v=2"></script>'
    : '';
  const css = extraCss || '';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <link rel="canonical" href="${abs(canonicalPath, locale)}">
  <link rel="alternate" hreflang="sv" href="${abs(pathSv, locale)}">
  <link rel="alternate" hreflang="en" href="${abs(pathEn, locale)}">
  <link rel="alternate" hreflang="x-default" href="${abs(pathSv, locale)}">
  <title>${escapeHtml(title)} | ${escapeHtml(brand)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${abs(canonicalPath, locale)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/landing.css?v=7">
  <link rel="stylesheet" href="/css/seo-article.css?v=2">
  <link rel="stylesheet" href="/css/resurser-print.css?v=${CSS_V}">${css}
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script src="/js/cookie-banner.js?v=2.13.2"></script>${langSwitcher}
</head>`;
}

function downloadCards(downloadIds, locale, t) {
  const items = downloadIds.map((id) => {
    const asset = pdfById(id);
    const copy = t.pdf[id] || {};
    const href = pdfPublicPath(asset, locale);
    return `      <a class="resurser-download-card" href="${href}" data-resource-pdf="${escapeHtml(id)}" data-resource-file="${escapeHtml(locale === 'en-GB' ? asset.fileEn : asset.fileSv)}">
        <span class="resurser-download-card__title">${escapeHtml(copy.cardTitle || copy.title || id)}</span>
        <span class="resurser-download-card__meta">${escapeHtml(t.ui.pdfA4)}${copy.cardHint ? ` · ${escapeHtml(copy.cardHint)}` : ''}</span>
      </a>`;
  });
  return `    <h2>${escapeHtml(t.ui.downloadHeading)}</h2>
    <div class="resurser-downloads" role="list">
${items.join('\n')}
    </div>`;
}

function howTo(t) {
  const items = (t.howTo || []).map((line) => `      <li>${escapeHtml(line)}</li>`).join('\n');
  return `    <h2>${escapeHtml(t.ui.howToHeading)}</h2>
    <ol class="resurser-howto">
${items}
    </ol>`;
}

function cta(t, slug) {
  return `    <div class="seo-cta-card">
      <h3>${escapeHtml(t.ui.ctaTitle)}</h3>
      <p>${escapeHtml(t.ui.ctaBody)}</p>
      <a href="${registerHref(slug)}" class="btn-primary" data-track="article_cta_register">${escapeHtml(t.ui.ctaButton)}</a>
    </div>`;
}

function relatedBlock(locale, t, relatedIds) {
  const links = [];
  for (const id of relatedIds) {
    if (id === 'hub') {
      links.push(`<a class="inline" href="${localePath(HUB.pathSv, HUB.pathEn, locale)}">${escapeHtml(t.ui.allCategories)}</a>`);
      continue;
    }
    const cat = categoryById(id);
    if (cat) {
      links.push(`<a class="inline" href="${localePath(cat.pathSv, cat.pathEn, locale)}">${escapeHtml(t.categories[cat.id].nav)}</a>`);
    }
  }
  if (!links.length) return '';
  return `    <div class="resurser-related-links">
      <p>${escapeHtml(t.ui.relatedHeading)}: ${links.join(' · ')}</p>
    </div>`;
}

function onScreenLink(cat, locale, t) {
  if (!cat.bildkortPathSv) return '';
  return `    <p class="resurser-onscreen"><a href="${localePath(cat.bildkortPathSv, cat.bildkortPathEn, locale)}">${escapeHtml(t.ui.seeOnScreen)}</a></p>`;
}

function pictogramGrid(keys, locale, ariaLabel) {
  const cards = keys.map((key) => {
    const label = pictogramLabel(key, locale);
    const src = publicSvgPathForKey(key);
    const visual = src
      ? `<img class="resurser-bildkort__img" src="${src}" alt="" width="64" height="64">`
      : `<span class="resurser-bildkort__badge" aria-hidden="true"></span>`;
    return `      <div class="resurser-bildkort">${visual}<span class="resurser-bildkort__label">${escapeHtml(label)}</span></div>`;
  });
  return `    <div class="resurser-bildkort-grid" aria-label="${escapeHtml(ariaLabel)}">
${cards.join('\n')}
    </div>`;
}

function pageShell({ locale, t, title, description, pathSv, pathEn, backHref, backLabel, h1, lead, body, relatedHtml, slug }) {
  return `${head({ locale, t, title, description, pathSv, pathEn })}
<body class="seo-article-page" data-resource-locale="${locale}" data-resource-path="${locale === 'en-GB' ? pathEn : pathSv}">
  <article class="seo-article">
    <a href="${backHref}" class="back-home">${escapeHtml(backLabel)}</a>
    <h1>${escapeHtml(h1)}</h1>
    <p class="lead">${rich(lead)}</p>
${body}
${cta(t, slug)}
${relatedHtml || ''}
  </article>
  <script src="/js/article-events.js?v=${ARTICLE_EVENTS_V}"></script>
  <script src="/js/sw-register.js?v=2.13.0"></script>
</body>
</html>
`;
}

function hubHtml(locale, t) {
  const catItems = CATEGORIES.map((c) => {
    const copy = t.categories[c.id];
    return `      <li><a class="inline" href="${localePath(c.pathSv, c.pathEn, locale)}"><strong>${escapeHtml(copy.nav)}</strong></a> — ${escapeHtml(copy.h1)}</li>`;
  }).join('\n');
  const otherItems = HUB.otherLandings.map((id) => {
    const landing = landingById(id);
    const copy = t.pdfLandings[id];
    return `      <li><a class="inline" href="${localePath(landing.pathSv, landing.pathEn, locale)}"><strong>${escapeHtml(copy.h1)}</strong></a></li>`;
  }).join('\n');
  const body = `    <h2>${escapeHtml(t.hub.categoriesHeading)}</h2>
    <ul>
${catItems}
    </ul>
    <h2>${escapeHtml(t.hub.otherHeading)}</h2>
    <ul>
${otherItems}
    </ul>
    <h2>${escapeHtml(t.hub.paperVsAppHeading)}</h2>
    <p>${escapeHtml(t.hub.paperVsAppBody)}</p>`;
  return pageShell({
    locale,
    t,
    title: t.hub.title,
    description: t.hub.description,
    pathSv: HUB.pathSv,
    pathEn: HUB.pathEn,
    backHref: locale === 'en-GB' ? '/en' : '/',
    backLabel: `← ${t.meta.brand}`,
    h1: t.hub.h1,
    lead: t.hub.lead,
    body,
    relatedHtml: '',
    slug: 'hub',
  });
}

function categoryHtml(cat, locale, t) {
  const copy = t.categories[cat.id];
  const body = `${downloadCards(cat.downloads, locale, t)}
${onScreenLink(cat, locale, t)}
${howTo(t)}`;
  return pageShell({
    locale,
    t,
    title: copy.title,
    description: copy.description,
    pathSv: cat.pathSv,
    pathEn: cat.pathEn,
    backHref: localePath(HUB.pathSv, HUB.pathEn, locale),
    backLabel: t.ui.backLibrary,
    h1: copy.h1,
    lead: copy.lead,
    body,
    relatedHtml: relatedBlock(locale, t, cat.related),
    slug: cat.id,
  });
}

function bildkortHtml(page, locale, t) {
  const copy = t.bildkortPages[page.id];
  const cat = categoryById(page.categoryId);
  const asset = pdfById(page.pdfId);
  const pdfHref = pdfPublicPath(asset, locale);
  const keys = asset.keys || [];
  const body = `    <div class="resurser-print-actions">
      <a href="${pdfHref}" class="btn-secondary" data-resource-pdf="${escapeHtml(page.pdfId)}">${escapeHtml(t.ui.downloadPdf)}</a>
      <button type="button" class="btn-secondary" onclick="window.print()">${escapeHtml(t.ui.printPage)}</button>
    </div>
${pictogramGrid(keys, locale, copy.h1)}
${howTo(t)}`;
  return pageShell({
    locale,
    t,
    title: copy.title,
    description: copy.lead,
    pathSv: page.pathSv,
    pathEn: page.pathEn,
    backHref: localePath(cat.pathSv, cat.pathEn, locale),
    backLabel: `← ${t.categories[page.id].nav}`,
    h1: copy.h1,
    lead: copy.lead,
    body,
    relatedHtml: relatedBlock(locale, t, [page.categoryId, 'hub']),
    slug: page.categoryId,
  });
}

function landingHtml(landing, locale, t) {
  const copy = t.pdfLandings[landing.id];
  const back = landing.categoryId
    ? categoryById(landing.categoryId)
    : HUB;
  const backHref = landing.categoryId
    ? localePath(back.pathSv, back.pathEn, locale)
    : localePath(HUB.pathSv, HUB.pathEn, locale);
  const backLabel = landing.categoryId
    ? `← ${t.categories[landing.categoryId].nav}`
    : t.ui.backLibrary;
  const related = landing.categoryId ? [landing.categoryId, 'hub'] : ['hub'];
  const body = `${downloadCards(landing.downloads, locale, t)}
${howTo(t)}`;
  return pageShell({
    locale,
    t,
    title: copy.title,
    description: copy.description,
    pathSv: landing.pathSv,
    pathEn: landing.pathEn,
    backHref,
    backLabel,
    h1: copy.h1,
    lead: copy.lead,
    body,
    relatedHtml: relatedBlock(locale, t, related),
    slug: landing.categoryId || landing.id,
  });
}

function writeFile(relative, html) {
  const full = path.join(PUBLIC, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html, 'utf8');
  console.log(`✓ ${relative}`);
}

function stripDirectLinkCopy(html) {
  return html
    .replace(/>Direct link: PDF</g, '>Download PDF<')
    .replace(/>Direct link: /g, '>')
    .replace(/>Direktlänk: /g, '>');
}

function rewriteLongtailDownloads() {
  const dirs = [
    path.join(PUBLIC, 'resurser'),
    path.join(PUBLIC, 'en', 'resources'),
  ];
  let count = 0;
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.endsWith('.html')) continue;
      const before = fs.readFileSync(full, 'utf8');
      const after = stripDirectLinkCopy(before);
      if (after !== before) {
        fs.writeFileSync(full, after, 'utf8');
        count += 1;
      }
    }
  }
  walk(dirs[0]);
  walk(dirs[1]);
  console.log(`Stripped Direct link copy in ${count} longtail files`);
}

function main() {
  for (const locale of LOCALES) {
    const t = loadResurserI18n(locale);
    writeFile(locale === 'en-GB' ? HUB.fileEn : HUB.fileSv, hubHtml(locale, t));
    for (const cat of CATEGORIES) {
      writeFile(locale === 'en-GB' ? cat.fileEn : cat.fileSv, categoryHtml(cat, locale, t));
    }
    for (const page of BILDKORT_PAGES) {
      writeFile(locale === 'en-GB' ? page.fileEn : page.fileSv, bildkortHtml(page, locale, t));
    }
    for (const landing of PDF_LANDINGS) {
      writeFile(locale === 'en-GB' ? landing.fileEn : landing.fileSv, landingHtml(landing, locale, t));
    }
  }
  rewriteLongtailDownloads();
}

main();
