'use strict';

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const requestIdMiddleware = require('./src/middleware/requestId');
const securityHeadersMiddleware = require('./src/middleware/securityHeaders');
const { globalLimiter, apiLimiter, adminApiLimiter } = require('./src/middleware/rateLimiter');
const { optionalAuth, restoreParentSession } = require('./src/middleware/auth');
const { loadLocales, getLocale, getAvailableLanguages } = require('./src/lib/i18n');
const {
  normalizeLocale,
  validateLocale,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
} = require('./src/lib/locale');
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

  app.get('/health', async (req, res) => {
    const { readDeployedSha } = require('./src/lib/deployed-sha');
    const { getIapReadinessSnapshot } = require('./src/lib/iap-readiness');
    const { getEnglishGlobalAvailabilityReadiness } = require('./src/lib/english-app-global-flag');
    const { cacheName } = require('./config/cache-version.json');
    const gitSha = readDeployedSha();
    const iap = getIapReadinessSnapshot();
    const englishGlobal = await getEnglishGlobalAvailabilityReadiness();
    res.json({
      status: 'healthy',
      version: '2.3.1',
      cache_version: cacheName,
      ...(gitSha ? { git_sha: gitSha } : {}),
      ...iap,
      ...englishGlobal,
    });
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
    const normalized = normalizeLocale(req.params.lang);
    if (!normalized) {
      return res.status(400).json({ error: 'Unsupported locale', supported: SUPPORTED_LOCALES });
    }
    res.json(getLocale(normalized));
  });

  app.get('/api/i18n', (req, res) => {
    res.json({ languages: getAvailableLanguages(), default: DEFAULT_LOCALE });
  });

  app.get('/api/i18n/options', async (req, res) => {
    try {
      const { isEnglishAppEnabled } = require('./src/lib/i18n-flags');
      const englishApp = await isEnglishAppEnabled(null);
      res.json({
        languages: getAvailableLanguages(),
        default: DEFAULT_LOCALE,
        english_app_enabled: englishApp,
      });
    } catch (err) {
      res.json({
        languages: getAvailableLanguages(),
        default: DEFAULT_LOCALE,
        english_app_enabled: false,
      });
    }
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
  app.use('/api/admin', adminApiLimiter);
  app.use('/api', childParentApiBlock, apiLimiter);

  // Maintenance must run before routes so API traffic is blocked during downtime.
  app.use(checkMaintenanceMode);

  const { buildSitemapXml } = require('./src/lib/sitemap');
  const { buildRobotsTxt } = require('./src/lib/seo-pages');
  app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buildSitemapXml());
  });
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buildRobotsTxt());
  });

  const { registerAabDownloadRoute } = require('./src/routes/aab-download');
  registerAabDownloadRoute(app);

  registerRoutes(app);

  app.use((req, res, next) => {
    if (
      /^\/js\/auth-entry-(failsafe|i18n)\.js$/.test(req.path) ||
      req.path === '/login' ||
      req.path === '/login.html' ||
      req.path === '/register' ||
      req.path === '/register.html' ||
      req.path === '/en/register'
    ) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
    next();
  });

  app.use(express.static(path.join(__dirname, 'public'), { index: false }));

  const { getLocalUploadDir } = require('./src/lib/object-storage');
  app.use('/uploads', (req, res, next) => {
    const p = req.path || '';
    if (p.startsWith('/avatars') || p.startsWith('/avatars-private')) {
      return res.status(404).end();
    }
    next();
  }, express.static(getLocalUploadDir(), { index: false, maxAge: '7d' }));
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
