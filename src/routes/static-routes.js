/**
 * Static asset routes.
 * Owns: service worker, PWA manifest, asset links.
 * Does NOT own: static HTML pages (those are served via express.static in server.js).
 */
const express = require('express');
const path = require('path');
const { buildAssetLinks, buildAppleAppSiteAssociation } = require('../lib/well-known');

const router = express.Router();

function sendAssetLinks(_req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.json(buildAssetLinks());
}

function sendAppleAppSiteAssociation(_req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.json(buildAppleAppSiteAssociation());
}

router.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'sw.js'));
});

router.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'manifest.json'));
});

router.get('/.well-known/assetlinks.json', sendAssetLinks);
router.get('/assetlinks.json', sendAssetLinks);

router.get('/.well-known/apple-app-site-association', sendAppleAppSiteAssociation);
router.get('/apple-app-site-association', sendAppleAppSiteAssociation);

// ─── Child view routing (A/B toggle) — serves before static middleware ──
router.use('/child', require('./child-view'));

module.exports = router;