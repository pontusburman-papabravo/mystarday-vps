'use strict';

const express = require('express');
const { CONTENT_KEYS, pathFor } = require('../../config/web-content-keys');
const { localeMarketQueryPath } = require('../../config/web-markets');
const { pageFor } = require('../../content/nl/pages');
const { renderLocaleDocument } = require('../lib/locale-document');
const { publicNotFoundHtml } = require('../lib/web-routing');

const router = express.Router();

const NL_KEYS = CONTENT_KEYS
  .filter((entry) => entry.paths.nl)
  .map((entry) => entry.key);

router.get('/nl', (req, res) => {
  const legacy = localeMarketQueryPath('/nl', req.query);
  if (legacy) return res.redirect(302, legacy);
  const page = pageFor('home');
  res.type('html').send(renderLocaleDocument('nl', page, '/nl'));
});

router.get('/nl/nl', (req, res) => {
  const page = pageFor('market-nl');
  res.type('html').send(renderLocaleDocument('nl', page, '/nl/nl'));
});

for (const key of NL_KEYS) {
  const routePath = pathFor(key, 'nl');
  if (!routePath || routePath === '/nl') continue;
  router.get(routePath, (req, res) => {
    const page = pageFor(key);
    res.type('html').send(renderLocaleDocument('nl', page, routePath));
  });
}

router.get('/nl/:segment', (req, res) => {
  const path = `/nl/${req.params.segment}`;
  res.status(404).type('html').send(publicNotFoundHtml('unknown-locale-path', path));
});

module.exports = router;
