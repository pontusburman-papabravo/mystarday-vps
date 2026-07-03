#!/usr/bin/env node
/**
 * Generate R2 resurser HTML pages from config/resurser-r2.js
 * Usage: node scripts/generate-resurser-r2-html.mjs
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
  R2_CATEGORY_PAGES,
  R2_BILDKORT_PAGES,
  R2_PDF_PAGES,
  pictogramLabels,
} = require('../config/resurser-r2');

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

function bildkortGrid(keys) {
  const labels = pictogramLabels(keys);
  return labels.map((p) =>
    `      <div class="resurser-bildkort"><span class="resurser-bildkort__emoji" aria-hidden="true">${p.emoji}</span><span class="resurser-bildkort__label">${p.label}</span></div>`
  ).join('\n');
}

const CATEGORY_COPY = {
  kanslor: {
    h1: 'Känslor — känslokort att skriva ut',
    lead: 'Åtta vanliga känslor som utskrivbara kort. Klipp ut, laminera gärna och använd när barnet ska sätta ord på hur det känns. Samma åtta nycklar som i appens känslokort (när det är aktiverat).',
    back: '/resurser',
    backLabel: '← Resursbibliotek',
    downloads: [
      ['Känslokort PDF', '/resurser/pdf/kanslor'],
      ['Känslokort att klippa ut', '/resurser/bildkort/kanslor'],
      ['Direktlänk: känslokort (PDF)', '/resurser/pdf/bildkort-kanslor.pdf'],
    ],
    related: 'Mer i biblioteket: <a class="inline" href="/resurser/overgangar">Övergångar</a> · <a class="inline" href="/resurser">Alla kategorier</a>',
    utm: 'resurs-kanslor',
  },
  overgangar: {
    h1: 'Övergångar — först–sedan och vänta-kort',
    lead: 'Övergångar är ofta det svåraste i vardagen. Här hittar du <strong>gratis övergångskort och scheman</strong> med först, sedan, nu och vänta — att skriva ut hemma eller i förskola.',
    back: '/resurser',
    backLabel: '← Resursbibliotek',
    downloads: [
      ['Övergångsschema PDF', '/resurser/pdf/overgangar'],
      ['Övergångskort att klippa ut', '/resurser/bildkort/overgangar'],
      ['Direktlänk: övergångskort (PDF)', '/resurser/pdf/bildkort-overgangar.pdf'],
    ],
    related: 'Läs vår guide om <a class="inline" href="/rutiner-npf-barn">rutiner för barn med NPF</a> · <a class="inline" href="/resurser/teacch-inspirerat">TEACCH-inspirerat</a>',
    utm: 'resurs-overgangar',
  },
  'teacch-inspirerat': {
    h1: 'TEACCH-inspirerat — utskrivbara kort',
    lead: '<strong>TEACCH-inspirerade utskrivbara kort</strong> — Först, Sedan, Klar med mera. Inspirerat av visuellt stöd och strukturerade arbetssystem på papper. <em>Inte</em> officiell TEACCH-metod eller certifiering. Min Stjärndag bygger inte ett digitalt ATT GÖRA/GÖR/KLAR-system i appen.',
    back: '/resurser',
    backLabel: '← Resursbibliotek',
    downloads: [
      ['TEACCH-inspirerade kort PDF', '/resurser/pdf/teacch-inspirerat'],
      ['Kort att klippa ut', '/resurser/bildkort/teacch-inspirerat'],
      ['Direktlänk: TEACCH-kort (PDF)', '/resurser/pdf/bildkort-teacch.pdf'],
    ],
    related: 'Mer: <a class="inline" href="/resurser/overgangar">Övergångar</a> · <a class="inline" href="/bildschema-app">Bildschema i app eller på papper</a>',
    utm: 'resurs-teacch',
  },
  skola: {
    h1: 'Skola — bildstöd att skriva ut',
    lead: 'Utskrivbara <strong>skolscheman och bildkort</strong> för skoldagsrutiner — rast, läxa, matsal och mer. Statiskt material att skriva ut; appen håller samma rutin levande i mobilen.',
    back: '/resurser',
    backLabel: '← Resursbibliotek',
    downloads: [
      ['Skolaschema PDF', '/resurser/pdf/skola'],
      ['Skola-bildkort', '/resurser/bildkort/skola'],
      ['Direktlänk: skolaschema-mall (PDF)', '/resurser/pdf/skolaschema.pdf'],
    ],
    related: 'Mer: <a class="inline" href="/veckoschema-bildstod">Veckoschema med bildstöd</a> · <a class="inline" href="/resurser/morgon">Morgon</a>',
    utm: 'resurs-skola',
  },
  hygien: {
    h1: 'Hygien — bildkort att skriva ut',
    lead: 'Gratis <strong>hygien-bildkort och schema</strong> — tvätta händer, borsta tänder, toalett och mer. Skriv ut hemma eller i förskola.',
    back: '/resurser',
    backLabel: '← Resursbibliotek',
    downloads: [
      ['Hygienschema PDF', '/resurser/pdf/hygien'],
      ['Hygien-bildkort', '/resurser/bildkort/hygien'],
      ['Direktlänk: hygienschema-mall (PDF)', '/resurser/pdf/hygienschema.pdf'],
    ],
    related: 'Mer: <a class="inline" href="/resurser/morgon">Morgon</a> · <a class="inline" href="/resurser/kvall">Kväll</a>',
    utm: 'resurs-hygien',
  },
};

function writeCategoryPage(page) {
  const copy = CATEGORY_COPY[page.slug];
  const dl = copy.downloads.map(([label, href]) =>
    `      <li><a href="${href}">${label}</a></li>`
  ).join('\n');

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <link rel="canonical" href="https://mystarday.se${page.path}">
  <title>${page.title} | Min Stjärndag</title>
  <meta name="description" content="${page.description}">
  <meta property="og:title" content="${page.title}">
  <meta property="og:description" content="${page.description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://mystarday.se${page.path}">
${HEAD_COMMON}
</head>
<body class="seo-article-page">
  <article class="seo-article">
    <a href="${copy.back}" class="back-home">${copy.backLabel}</a>
    <h1>${copy.h1}</h1>
    <p class="lead">${copy.lead}</p>

    <h2>Ladda ner</h2>
    <ul class="resurser-download-list">
${dl}
    </ul>

    <div class="seo-cta-card">
      <h3>Vill du slippa skriva ut om varje vecka?</h3>
      <p>Testa Min Stjärndag gratis — levande schema med bildstöd som barnet kan följa själv.</p>
      <a href="/register?utm_content=${copy.utm}" class="btn-primary" data-track="article_cta_register">Testa Min Stjärndag gratis</a>
    </div>

    <div class="resurser-related-links">
      <p>${copy.related}</p>
    </div>
  </article>
${TAIL}`;

  fs.writeFileSync(path.join(ROOT, 'public', page.file), html);
  console.log(`✓ ${page.file}`);
}

function writeBildkortPage(page) {
  const categoryPath = `/resurser/${page.slug}`;
  const pdfSlug = page.slug === 'teacch-inspirerat' ? 'bildkort-teacch' : `bildkort-${page.slug}`;
  const labels = pictogramLabels(page.pictogramKeys);
  const count = labels.length;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <link rel="canonical" href="https://mystarday.se${page.path}">
  <title>${page.title} | Min Stjärndag</title>
  <meta name="description" content="Gratis ${page.title.toLowerCase()} — skriv ut sidan eller ladda ner PDF.">
  <meta property="og:title" content="${page.title}">
  <meta property="og:url" content="https://mystarday.se${page.path}">
${HEAD_COMMON}
</head>
<body class="seo-article-page">
  <article class="seo-article">
    <a href="${categoryPath}" class="back-home">← ${page.slug === 'teacch-inspirerat' ? 'TEACCH-inspirerat' : page.slug.charAt(0).toUpperCase() + page.slug.slice(1)}</a>
    <h1>${page.title}</h1>
    <p class="lead">${count} utskrivbara kort. Klipp ut, laminera gärna och använd på tavla eller kylskåp. Symbolerna är förenklade emoji tills illustrationer finns — samma nycklar som i appens bildbibliotek.</p>

    <div class="resurser-print-actions">
      <a href="/resurser/pdf/${pdfSlug}.pdf" class="btn-secondary">Ladda ner PDF</a>
      <button type="button" class="btn-secondary" onclick="window.print()">Skriv ut denna sida</button>
    </div>

    <div class="resurser-bildkort-grid" aria-label="${page.title}">
${bildkortGrid(page.pictogramKeys)}
    </div>

    <div class="seo-cta-card">
      <h3>Levande schema i appen</h3>
      <p>Barnet bockar av stegen själv — utan att du skriver ut om varje vecka.</p>
      <a href="/register?utm_content=resurs-${page.slug}" class="btn-primary" data-track="article_cta_register">Testa Min Stjärndag gratis</a>
    </div>
  </article>
${TAIL}`;

  fs.writeFileSync(path.join(ROOT, 'public', page.file), html);
  console.log(`✓ ${page.file}`);
}

const PDF_COPY = {
  kanslor: { back: '/resurser/kanslor', backLabel: '← Känslor', h1: 'Känslokort PDF', howto: 'Skriv ut på A4 och klipp ut korten. Använd när barnet ska sätta ord på känslor.' },
  overgangar: { back: '/resurser/overgangar', backLabel: '← Övergångar', h1: 'Övergångsschema PDF', howto: 'Skriv ut schemat eller klipp ut <a class="inline" href="/resurser/bildkort/overgangar">övergångskorten</a> separat. Förvarna vid byten mellan aktiviteter.' },
  'teacch-inspirerat': { back: '/resurser/teacch-inspirerat', backLabel: '← TEACCH-inspirerat', h1: 'TEACCH-inspirerat PDF', howto: 'TEACCH-inspirerade kort att klippa ut — inspirerat av visuellt stöd, inte officiell TEACCH-metod.' },
  skola: { back: '/resurser/skola', backLabel: '← Skola', h1: 'Skolaschema PDF', howto: 'Skriv ut och sätt upp där barnet ser skoldagsrutinen. Justera steg efter er vecka.' },
  hygien: { back: '/resurser/hygien', backLabel: '← Hygien', h1: 'Hygienschema PDF', howto: 'Skriv ut hygienrutinen steg för steg — eller använd <a class="inline" href="/resurser/bildkort/hygien">bildkorten</a> separat.' },
  beloningsschema: { back: '/resurser', backLabel: '← Resursbibliotek', h1: 'Belöningsschema PDF', howto: 'Skriv ut stjärnschemat på kylskåpet eller väggen. Fyll i aktiviteter och mål — samma idé som ett papper-belöningssystem.' },
  veckoschema: { back: '/resurser', backLabel: '← Resursbibliotek', h1: 'Veckoschema PDF', howto: 'Skriv ut veckomallen och fyll i vad som händer varje dag. Kompletterar appens <a class="inline" href="/veckoschema-bildstod">levande veckoschema</a>.' },
  helgschema: { back: '/resurser', backLabel: '← Resursbibliotek', h1: 'Helgschema PDF', howto: 'Skriv ut helgschemat och markera vilka steg som gäller lördag och söndag. Bra när helgen ska kännas förutsägbar utan skolstress.' },
  laxschema: { back: '/resurser/skola', backLabel: '← Skola', h1: 'Läxschema PDF', howto: 'Dela upp läxorna i små steg med paus — barnet ser när det är klart. Kompletterar <a class="inline" href="/resurser/pdf/skola">skolaschema PDF</a>.' },
};

function writePdfPage(page) {
  const copy = PDF_COPY[page.slug];
  const dl = page.downloads.map((d) =>
    `      <li><a href="${d.href}" download>${d.label}</a></li>`
  ).join('\n');

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <link rel="canonical" href="https://mystarday.se${page.path}">
  <title>${page.title} | Min Stjärndag</title>
  <meta name="description" content="${page.description}">
  <meta property="og:title" content="${page.title}">
  <meta property="og:description" content="${page.description}">
  <meta property="og:url" content="https://mystarday.se${page.path}">
${HEAD_COMMON}
</head>
<body class="seo-article-page">
  <article class="seo-article">
    <a href="${copy.back}" class="back-home">${copy.backLabel}</a>
    <h1>${copy.h1}</h1>
    <p class="lead">${page.description}</p>

    <h2>Ladda ner PDF</h2>
    <ul class="resurser-download-list">
${dl}
    </ul>

    <h2>Så använder du mallen</h2>
    <p>${copy.howto}</p>

    <div class="seo-cta-card">
      <h3>Slipp skriva ut om varje vecka</h3>
      <p>Min Stjärndag håller rutinen levande — barnet bockar av stegen i mobilen.</p>
      <a href="/register?utm_content=resurs-${page.slug}" class="btn-primary" data-track="article_cta_register">Testa Min Stjärndag gratis</a>
    </div>
  </article>
${TAIL}`;

  fs.writeFileSync(path.join(ROOT, 'public', page.file), html);
  console.log(`✓ ${page.file}`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const p of R2_CATEGORY_PAGES) writeCategoryPage(p);
for (const p of R2_BILDKORT_PAGES) writeBildkortPage(p);
for (const p of R2_PDF_PAGES) writePdfPage(p);
console.log('Done — R2 HTML pages generated');
