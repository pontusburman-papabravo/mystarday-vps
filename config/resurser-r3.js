'use strict';

/**
 * Resursbibliotek R3 — long-tail SEO landing pages (Phase R3).
 * HTML generated via scripts/generate-resurser-r3-html.mjs
 */

const { R3_PAGES_DATA } = require('./resurser-r3-pages-data');
const { R3_EXTRA_SECTIONS } = require('./resurser-r3-extra-sections');
const { R3_DOWNLOAD_META, R3_RELATED_LABELS } = require('./resurser-r3-downloads');
const { WEEKEND_KEYS, HOMEWORK_KEYS } = require('./resurser-r3-pdf-keys');

/** R3-only PDF landing pages (helg + läxa). */
const R3_PDF_PAGES = [
  {
    path: '/resurser/pdf/helgschema',
    file: 'resurser/pdf-helgschema.html',
    slug: 'helgschema',
    title: 'Helgschema PDF — mall med bildstöd',
    description: 'Gratis helgschema att skriva ut — lugna lördags- och söndagssteg utan skolstress.',
    pictogramKeys: WEEKEND_KEYS,
  },
  {
    path: '/resurser/pdf/laxschema',
    file: 'resurser/pdf-laxschema.html',
    slug: 'laxschema',
    title: 'Läxschema PDF — steg för steg med bildstöd',
    description: 'Gratis läxschema att skriva ut — dela upp läxor i små moment med paus och klart.',
    pictogramKeys: HOMEWORK_KEYS,
  },
];

/** Static PDF filenames shipped for R3. */
const R3_PDF_FILES = ['helgschema.pdf', 'laxschema.pdf'];

const R3_LONGTAIL_PAGES = R3_PAGES_DATA.map((page) => {
  const extra = R3_EXTRA_SECTIONS[page.slug];
  const sections = extra ? [...page.sections, extra] : page.sections;
  return {
    path: `/resurser/${page.slug}`,
    file: `resurser/${page.slug}.html`,
    slug: page.slug,
    intent: page.intent,
    title: page.title,
    description: page.description,
    h1: page.h1,
    lead: page.lead,
    sections,
    relatedSlugs: page.relatedSlugs,
    downloadSlug: page.downloadSlug,
  };
});

const R3_INDEXABLE_PATHS = [
  ...R3_LONGTAIL_PAGES.map((p) => p.path),
  ...R3_PDF_PAGES.map((p) => p.path),
];

/** Plain-text body for word-count tests — strips HTML from lead/sections. */
function r3PagePlainText(page) {
  const parts = [page.lead || ''];
  for (const section of page.sections || []) {
    if (section.h2) parts.push(section.h2);
    for (const p of section.paragraphs || []) parts.push(p);
    for (const b of section.bullets || []) parts.push(b);
  }
  return parts.join(' ').replace(/<[^>]+>/g, ' ');
}

function countSwedishWords(text) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 0).length;
}

module.exports = {
  R3_LONGTAIL_PAGES,
  R3_PDF_PAGES,
  R3_PDF_FILES,
  R3_INDEXABLE_PATHS,
  R3_DOWNLOAD_META,
  R3_RELATED_LABELS,
  WEEKEND_KEYS,
  HOMEWORK_KEYS,
  r3PagePlainText,
  countSwedishWords,
};
