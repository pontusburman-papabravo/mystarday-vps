'use strict';

const express = require('express');
const { CONTENT_KEYS } = require('../../config/web-content-keys');
const { MARKETS, localeMarketQueryPath, campaignPath } = require('../../config/web-markets');
const { publicPathLocales } = require('../../config/web-locales');
const { hasLocalePages, pageForLocale } = require('../../content/locale-pages');
const { renderLocaleDocument } = require('../lib/locale-document');
const { publicNotFoundHtml } = require('../lib/web-routing');

const router = express.Router();

for (const locale of publicPathLocales()) {
  if (!hasLocalePages(locale.code)) continue;
  const prefix = locale.pathPrefix;

  router.get(prefix, (req, res) => {
    const legacy = localeMarketQueryPath(prefix, req.query);
    if (legacy) return res.redirect(302, legacy);
    const page = pageForLocale(locale.code, 'home');
    res.type('html').send(renderLocaleDocument(locale.code, page, prefix));
  });

  for (const market of Object.values(MARKETS)) {
    if (!market.campaignLocales.includes(locale.code)) continue;
    const routePath = campaignPath(market, locale.code);
    if (!routePath) continue;
    router.get(routePath, (req, res) => {
      const page = pageForLocale(locale.code, `market-${market.pathSegment}`);
      res.type('html').send(renderLocaleDocument(locale.code, page, routePath));
    });
  }

  for (const entry of CONTENT_KEYS) {
    const routePath = entry.paths[locale.code];
    if (!routePath || routePath === prefix) continue;
    router.get(routePath, (req, res) => {
      const page = pageForLocale(locale.code, entry.key);
      res.type('html').send(renderLocaleDocument(locale.code, page, routePath));
    });
  }

  router.get(`${prefix}/:segment`, (req, res) => {
    const path = `${prefix}/${req.params.segment}`;
    res.status(404).type('html').send(publicNotFoundHtml('unknown-locale-path', path));
  });
}

module.exports = router;
