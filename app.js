'use strict';

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const requestIdMiddleware = require('./src/middleware/requestId');
const securityHeadersMiddleware = require('./src/middleware/securityHeaders');
const { globalLimiter, apiLimiter } = require('./src/middleware/rateLimiter');
const { optionalAuth, restoreParentSession } = require('./src/middleware/auth');
const { loadLocales, getLocale, getAvailableLanguages } = require('./src/lib/i18n');
const checkMaintenanceMode = require('./src/middleware/maintenance');
const { blockImpersonationWrites } = require('./src/middleware/impersonation');
const { csrfProtect } = require('./src/middleware/csrf');
const { createDomainRedirect } = require('./src/lib/domain-redirect');
const platformHtmlInject = require('./src/middleware/platform-html');
const { buildAssetLinks, buildAppleAppSiteAssociation } = require('./src/lib/well-known');
const { registerRoutes } = require('./src/routes/index');

/**
 * Build the Express app without binding a port or starting schedulers.
 * Used by server.js and integration tests.
 */
function createApp() {
  const app = express();

  app.use((req, res, next) => {
    req.setTimeout(30000, () => {
      console.warn('[TIMEOUT] request exceeded 30s — path=%s method=%s ip=%s', req.path, req.method, req.ip);
    });
    next();
  });

  const { handleResendWebhook } = require('./src/routes/resend-webhook');
  const { handleIapWebhook } = require('./src/routes/iap-webhook-handler');
  const { resendWebhookLimiter, iapWebhookLimiter } = require('./src/middleware/rateLimiter');
  app.post(
    '/api/resend/webhook',
    resendWebhookLimiter,
    express.raw({ type: 'application/json' }),
    handleResendWebhook
  );
  app.post(
    '/api/iap/webhook',
    iapWebhookLimiter,
    express.raw({ type: 'application/json' }),
    handleIapWebhook
  );

  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(cookieParser());
  app.use(requestIdMiddleware());
  // Restore parent session before JWT decode so optionalAuth sees the correct token.
  // Global optionalAuth lets globalLimiter skip authenticated API traffic (200 req/min IP budget).
  app.use(restoreParentSession);
  app.use(optionalAuth);
  app.use(globalLimiter);
  app.use(platformHtmlInject);
  app.use(securityHeadersMiddleware());
  loadLocales();

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', version: '2.3.1' });
  });

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

  app.get('/.well-known/assetlinks.json', sendAssetLinks);
  app.get('/assetlinks.json', sendAssetLinks);
  app.get('/.well-known/apple-app-site-association', sendAppleAppSiteAssociation);
  app.get('/apple-app-site-association', sendAppleAppSiteAssociation);

  app.use(createDomainRedirect());

  app.get('/api/i18n/:lang', (req, res) => {
    const locale = getLocale(req.params.lang);
    res.json(locale);
  });

  app.get('/api/i18n', (req, res) => {
    res.json({ languages: getAvailableLanguages(), default: 'sv' });
  });

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  });
  app.set('etag', false);

  app.use('/api', csrfProtect);
  app.use('/api', blockImpersonationWrites);

  const { childParentApiBlock } = require('./src/middleware/child-parent-api-block');
  app.use('/api', childParentApiBlock, apiLimiter);

  // Maintenance must run before routes so API traffic is blocked during downtime.
  app.use(checkMaintenanceMode);

  const { buildSitemapXml } = require('./src/lib/sitemap');
  app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buildSitemapXml());
  });

  registerRoutes(app);

  app.use(express.static(path.join(__dirname, 'public'), { index: false }));

  const { getLocalUploadDir } = require('./src/lib/object-storage');
  app.use('/uploads', express.static(getLocalUploadDir(), { index: false, maxAge: '7d' }));
  app.use('/V2.0', express.static(path.join(__dirname, 'public', 'v2'), { index: 'index.html' }));

  app.use(require('./src/routes/public-pages'));

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Endpoint hittades inte' });
    }
    if (req.path.startsWith('/.well-known/')) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (req.path.startsWith('/resurser/')) {
      return res.status(404).type('html').send(
        '<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<title>Sidan hittades inte — Min Stjärndag</title></head><body>'
        + '<h1>Sidan hittades inte</h1>'
        + '<p><a href="/resurser">Till resursbiblioteket</a></p></body></html>',
      );
    }
    res.redirect('/');
  });

  app.use((err, req, res, _next) => {
    const errPath = req.path.startsWith('/api/events') ? req.path : req.originalUrl;
    console.error('[SERVER] Unhandled error', {
      operation: 'server.error',
      path: errPath,
      error: err.message || String(err),
    }, err);
    res.status(500).json({ error: 'Internt serverfel' });
  });

  return app;
}

module.exports = { createApp };
