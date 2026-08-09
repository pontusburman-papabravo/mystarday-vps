/**
 * Public archive pages for landing news (Swedish + English).
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { getArchivedItems } = require('../../db/landing-news');
const { buildArchiveListHtml } = require('../lib/landing-news-archive-html');
const {
  injectSiteUrl,
  injectBrandPlaceholders,
} = require('../lib/public-html-placeholders');

const router = express.Router();

const PAGES = {
  sv: {
    path: '/nyheter/arkiv',
    file: 'nyheter-arkiv.html',
    locale: 'sv',
  },
  en: {
    path: '/en/news/archive',
    file: path.join('en', 'news-archive.html'),
    locale: 'en',
  },
};

async function serveArchive(res, { file, locale }) {
  const htmlPath = path.join(__dirname, '..', '..', 'public', file);
  if (!fs.existsSync(htmlPath)) {
    return res.status(404).send('Not found');
  }
  let items = [];
  try {
    items = await getArchivedItems();
  } catch (err) {
    console.error('[landing-news-archive] load error:', err.message);
  }
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = injectBrandPlaceholders(html);
  html = injectSiteUrl(html);
  html = html.replace('__ARCHIVE_LIST__', buildArchiveListHtml(items, locale));
  res.type('html').send(html);
  return true;
}

router.get(PAGES.sv.path, (req, res) => {
  serveArchive(res, PAGES.sv);
});

router.get(PAGES.en.path, (req, res) => {
  serveArchive(res, PAGES.en);
});

module.exports = router;
