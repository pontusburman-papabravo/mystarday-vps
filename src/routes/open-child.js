'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { getPlayStoreUrl, getAppleAppStoreUrl } = require('../../config/store-links');

const router = express.Router();

const TEMPLATE_PATH = path.join(__dirname, '../../public/open-child.html');
let templateCache = null;

function loadTemplate() {
  if (!templateCache) {
    templateCache = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  }
  return templateCache;
}

function renderOpenChildPage() {
  return loadTemplate()
    .replace(/__APPLE_STORE_URL__/g, getAppleAppStoreUrl())
    .replace(/__PLAY_STORE_URL__/g, getPlayStoreUrl());
}

router.get('/open/child', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.type('html').send(renderOpenChildPage());
});

module.exports = router;
module.exports.renderOpenChildPage = renderOpenChildPage;
