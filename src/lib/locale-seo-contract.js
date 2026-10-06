'use strict';

/**
 * Minimum contract for a seoEnabled public locale.
 * A locale that fails is left out of the app-host sitemap.
 * Swedish pages stay on their existing templates; this gates path locales.
 */

const fs = require('fs');
const path = require('path');
const { REQUIRED_SEO_CONTENT } = require('../../config/web-locales');
const { localeHasSeoChrome, pathFor } = require('../../config/web-content-keys');
const { pageFor } = require('../../content/nl/pages');

const EN_FILES = Object.freeze({
  home: 'public/en.html',
  faq: 'public/en-faq.html',
  visualSchedule: 'public/en/visual-schedule-app.html',
  privacy: 'public/en-privacy.html',
  terms: 'public/en-terms.html',
});

function localeSeoGaps(localeCode) {
  const gaps = [];
  if (!localeHasSeoChrome(localeCode)) gaps.push('chrome');
  for (const key of REQUIRED_SEO_CONTENT) {
    if (!pathFor(key, localeCode)) gaps.push(`path.${key}`);
  }
  if (localeCode === 'en') {
    for (const key of REQUIRED_SEO_CONTENT) {
      const rel = EN_FILES[key];
      if (!rel || !fs.existsSync(path.join(__dirname, '../../', rel))) gaps.push(`file.${key}`);
    }
  }
  if (localeCode === 'nl') {
    for (const key of REQUIRED_SEO_CONTENT) {
      const page = pageFor(key);
      if (!page || !page.title || !page.description || !page.h1 || !page.body) gaps.push(`page.${key}`);
    }
  }
  return gaps;
}

function localeMeetsSeoContract(localeCode) {
  return localeSeoGaps(localeCode).length === 0;
}

module.exports = {
  EN_FILES,
  localeSeoGaps,
  localeMeetsSeoContract,
};
