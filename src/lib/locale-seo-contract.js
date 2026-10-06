'use strict';

/**
 * Minimum contract for a seoEnabled public locale.
 * A locale that fails is left out of the app-host sitemap.
 * Swedish pages stay on their existing templates; this gates path locales.
 */

const fs = require('fs');
const path = require('path');
const { REQUIRED_SEO_CONTENT, LOCALES } = require('../../config/web-locales');
const { localeHasSeoChrome, pathFor } = require('../../config/web-content-keys');
const { chromeFor } = require('../../config/web-locale-chrome');
const { hasLocalePages, pageForLocale } = require('../../content/locale-pages');

const EN_FILES = Object.freeze({
  home: 'public/en.html',
  howItWorks: 'public/en-how-it-works.html',
  visualSchedule: 'public/en/visual-schedule-app.html',
  morningRoutine: 'public/en/morning-routine-children.html',
  weeklySchedule: 'public/en/weekly-schedule-visual-support.html',
  neurodiverseRoutines: 'public/en/routines-neurodiverse-children.html',
  rewardSystem: 'public/en/reward-system-children.html',
  resources: 'public/en/resources.html',
  faq: 'public/en-faq.html',
  privacy: 'public/en-privacy.html',
  terms: 'public/en-terms.html',
});

function localeSeoGaps(localeCode) {
  // Swedish stays on the existing .se templates. This contract gates path locales.
  if (localeCode === 'sv') return [];
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
  const locale = LOCALES[localeCode];
  if (locale && locale.publicWeb && locale.pathPrefix && localeCode !== 'en') {
    if (!hasLocalePages(localeCode)) gaps.push('pages');
    else {
      const chrome = chromeFor(localeCode);
      for (const field of ['faq', 'privacy', 'terms', 'notFoundTitle', 'notFoundH1', 'notFoundLink']) {
        if (!chrome || !String(chrome[field] || '').trim()) gaps.push(`chrome.${field}`);
      }
      for (const key of REQUIRED_SEO_CONTENT) {
        const page = pageForLocale(localeCode, key);
        if (!page || !page.title || !page.description || !page.h1 || !page.body) gaps.push(`page.${key}`);
        else if (/__PLACEHOLDER__|lorem ipsum/i.test(`${page.title}\n${page.body}`) || /\bTODO\b/.test(`${page.title}\n${page.body}`)) {
          gaps.push(`placeholder.${key}`);
        }
      }
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
