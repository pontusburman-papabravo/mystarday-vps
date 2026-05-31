const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const logger = require('./src/lib/logger');
const requestIdMiddleware = require('./src/middleware/requestId');
const securityHeadersMiddleware = require('./src/middleware/securityHeaders');
const { globalLimiter, apiLimiter } = require('./src/middleware/rateLimiter');
const { optionalAuth, restoreParentSession } = require('./src/middleware/auth');
const { loadLocales, getLocale, getAvailableLanguages } = require('./src/lib/i18n');
const { startMidnightScheduler, stopMidnightScheduler } = require('./src/lib/midnight-scheduler');
const { startDeletionScheduler, stopDeletionScheduler } = require('./src/lib/deletion-scheduler');
const { startWeeklySummaryScheduler, stopWeeklySummaryScheduler } = require('./src/lib/weekly-summary-scheduler');
const { startLibraryNotificationScheduler, stopLibraryNotificationScheduler } = require('./src/lib/library-notifications');
const { startNyhetScheduler, stopNyhetScheduler } = require('./src/lib/nyhet-scheduler');
const { startPushReminderScheduler, stopPushReminderScheduler } = require('./src/lib/push-reminder-scheduler');
const { startWinBackScheduler, stopWinBackScheduler } = require('./src/lib/win-back-scheduler');
const { pool } = require('./src/lib/db');
const checkMaintenanceMode = require('./src/middleware/maintenance');
const { blockImpersonationWrites } = require('./src/middleware/impersonation');
const { csrfProtect } = require('./src/middleware/csrf');
const { createDomainRedirect } = require('./src/lib/domain-redirect');
const platformHtmlInject = require('./src/middleware/platform-html');
const { registerRoutes } = require('./src/routes/index');

const app = express();
const port = process.env.PORT || 3000;

// ─── Global request timeout ──────────────────────────────────
// Kill any request that takes >30s server-side.
// This is a safety net — POST /api/reports has its own 20s per-route timeout.
// Prevents Neon cold-start hangs from leaking indefinitely.
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    console.warn('[TIMEOUT] request exceeded 30s — path=%s method=%s ip=%s', req.path, req.method, req.ip);
  });
  next();
});

// ─── Middleware ────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());

// ─── Structured logging with Pino ──────────────────────────
app.use(requestIdMiddleware());

app.use(globalLimiter);

// ─── Platform HTML injection (Capacitor vs web) ──
app.use(platformHtmlInject);

// ─── Security headers ─────────────────────────────────────
app.use(securityHeadersMiddleware());

// ─── Load i18n ────────────────────────────────────────────
loadLocales();

// ─── Health check (no DB query — allows Neon auto-suspend) ─
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: '2.3.1' });
});

// ─── Redirect secondary domains to main domain ────────────
app.use(createDomainRedirect());

// ─── i18n API ─────────────────────────────────────────────
app.get('/api/i18n/:lang', (req, res) => {
  const locale = getLocale(req.params.lang);
  res.json(locale);
});

app.get('/api/i18n', (req, res) => {
  res.json({ languages: getAvailableLanguages(), default: 'sv' });
});

// ─── API cache prevention ────────────────────────────────
// Disable ETags and set no-store on all /api/* responses.
// Why: Express auto-generates ETags on res.json(), causing browsers to send
// conditional requests (If-None-Match). 304 responses + Service Worker fetch
// can break JSON body reconstitution, leaving pages stuck on "Laddar…".
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
app.set('etag', false); // Disable ETags globally (only API uses res.json)

// ─── CSRF protection (all /api/* state-changing requests) ────────
// Double-submit cookie pattern. Exempt: auth bootstrap endpoints, safe methods.
app.use('/api', csrfProtect);

// ─── Impersonation write-block (applies to all /api/* non-GET) ────
// Must be mounted AFTER auth middleware but BEFORE API routes.
// Decodes isImpersonation flag from JWT — no DB query on GET paths.
app.use('/api', blockImpersonationWrites);

// ─── Per-user API limiter (100 req/min authenticated, 30 unauthenticated) ─
// optionalAuth sets req.user if a valid JWT is present; apiLimiter keys on it.
// SSE (/api/events) is skipped inside apiLimiter — long-lived connections
// must not consume rate limit tokens.
// Restore parent session before auth check — fixes child-login overwriting parent cookies.
app.use('/api', restoreParentSession, optionalAuth, apiLimiter);

// ─── API Routes ───────────────────────────────────────────
registerRoutes(app);

// ─── Static files ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ─── V2.0 design mockup (static, read-only) ───────────────
app.use('/V2.0', express.static(path.join(__dirname, 'public', 'v2'), { index: 'index.html' }));

// ─── Maintenance mode ─────────────────────────────────────
app.use(checkMaintenanceMode);

// ─── Subscription paywall guard ─────────────────────────────────────
// Blocks expired/future-require families from accessing protected routes.
// Exempts: auth, webhook, health, upgrade page routes.
const { requireActiveSubscription } = require('./src/middleware/subscription');
app.use('/api', (req, res, next) => {
  const p = req.path;
  if (
    p.startsWith('/auth') ||
    p.startsWith('/stripe') ||
    p === '/health' ||
    p.startsWith('/landing') ||
    p === '/i18n' ||
    p === '/i18n/'
  ) return next();
  requireActiveSubscription(req, res, next);
});

// Public static pages (privacy policy, professional landing page)
app.use(require('./src/routes/public-pages'));

// ─── Payment success ──────────────────────────────────────
app.use('/payment', require('./src/routes/payment'));

// ─── Upgrade success (Stripe redirect) ───────────────────
app.use('/upgrade', require('./src/routes/upgrade-success'));

// ─── 404 handler ──────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint hittades inte' });
  }
  res.redirect('/');
});

// ─── Error handler ────────────────────────────────────────
app.use((err, req, res, _next) => {
  // Never log query strings for /api/events — they may contain ?token= JWTs.
  const path = req.path.startsWith('/api/events') ? req.path : req.originalUrl;
  req.log.error(
    { msg: 'Unhandled error', operation: 'server.error', path, error: err.message || err },
    err
  );
  res.status(500).json({ error: 'Internt serverfel' });
});

// ─── Start ────────────────────────────────────────────────
const server = app.listen(port, () => {
  logger.info({ msg: 'Server started', operation: 'server.start', port });
  startMidnightScheduler();
  startDeletionScheduler();
  startWeeklySummaryScheduler();
  startLibraryNotificationScheduler();
  startNyhetScheduler();
  startPushReminderScheduler();
  startWinBackScheduler();
});

// ─── Graceful termination (#17) ───────────────────────────
// Render sends SIGTERM on deploy — stop timers, drain pool, then exit.
function onTermSignal(signal) {
  logger.info({ msg: 'Termination signal received', operation: 'server.shutdown', signal });
  stopMidnightScheduler(); stopDeletionScheduler(); stopWeeklySummaryScheduler(); stopLibraryNotificationScheduler(); stopNyhetScheduler(); stopPushReminderScheduler(); stopWinBackScheduler();
  server.close(() => {
    pool.end()
      .then(() => {
        logger.info({ msg: 'Database pool closed', operation: 'server.shutdown.pool_close' });
        process.exit(0);
      })
      .catch((err) => {
        logger.error({ msg: 'Pool close error', operation: 'server.shutdown.pool_error', error: err.message }, err);
        process.exit(1);
      });
  });
  setTimeout(() => {
    logger.error({ msg: 'Forced exit after 10s', operation: 'server.shutdown.timeout' });
    process.exit(1);
  }, 10000).unref();
}
process.on('SIGTERM', () => onTermSignal('SIGTERM')); process.on('SIGINT', () => onTermSignal('SIGINT'));
