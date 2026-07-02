'use strict';

/**
 * Resursbibliotek R3 — long-tail SEO landing pages (Phase R3).
 * HTML generated via scripts/generate-resurser-r3-html.mjs
 */

const { R3_PAGES_DATA } = require('./resurser-r3-pages-data');
const { R3_EXTRA_SECTIONS } = require('./resurser-r3-extra-sections');
const { R3_DOWNLOAD_META, R3_RELATED_LABELS } = require('./resurser-r3-downloads');

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

const R3_INDEXABLE_PATHS = R3_LONGTAIL_PAGES.map((p) => p.path);

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
  R3_INDEXABLE_PATHS,
  R3_DOWNLOAD_META,
  R3_RELATED_LABELS,
  r3PagePlainText,
  countSwedishWords,
};
