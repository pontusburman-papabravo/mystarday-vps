/**
 * Rate limiting middleware.
 * Owns: global IP limiter, login limiter, registration limiter, per-user API limiter.
 * Does NOT own: child PIN lockout (DB-based, lives in auth routes).
 *
 * Kill switch: set RATE_LIMIT_ENABLED=false to bypass all limits (useful during incidents).
 * In-memory store — does not survive restarts and is not shared across multiple instances.
 * If multi-instance scaling is required, replace MemoryStore with rate-limit-redis.
 */
const rateLimit = require('express-rate-limit');
const config = require('../lib/config');

// All 429 responses include Retry-After via standardHeaders: true.
// When RATE_LIMIT_ENABLED=false every limiter becomes a pass-through.
const ENABLED = config.rateLimits.enabled;

/**
 * Get the real client IP. Cloudflare sets CF-Connecting-IP to the true
 * end-user IP. Express's req.ip relies on trust proxy depth, which can
 * return Cloudflare edge IPs when behind Cloudflare + Render (two hops).
 * Using CF-Connecting-IP avoids bucket collision across unrelated users.
 */
function getRealIp(req) {
  return req.headers['cf-connecting-ip'] || req.ip;
}

// Shared handler: log blocked attempt + return 429
function onLimitReached(req, res, options) {
  const retryAfterSec = Math.ceil(options.windowMs / 1000);
  const maxVal = typeof options.max === 'function' ? '(dynamic)' : options.max;
  console.warn(
    `[RATE_LIMIT] blocked — ip=${getRealIp(req)} path=${req.path} ` +
    `limit=${maxVal} window=${options.windowMs}ms retry_after=${retryAfterSec}s`
  );
}

/**
 * Global limiter: 200 req/min per IP.
 * SSE endpoint (/api/events) is long-lived and explicitly skipped.
 * Authenticated requests are skipped — they are already protected by
 * apiLimiter with per-user keys (user:parentId). The global limiter only
 * applies to unauthenticated traffic (API abuse / brute-force protection).
 *
 * Static assets (.js, .css, .png, etc.) are exempt — they are not abuse
 * vectors, and counting them against the IP limit caused the admin panel
 * to break on mobile (20+ JS files per page load exhausted the IP budget
 * → 429 on API calls → redirect to /login).
 */
const STATIC_EXT_RE = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|mp4|webm|json|xml|txt|pdf)$/i;

const globalLimiter = rateLimit({
  windowMs: config.rateLimits.global.windowMs,
  max: ENABLED ? config.rateLimits.global.max : 0, // 0 = unlimited when disabled
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'För många förfrågningar. Vänta en stund och försök igen.' },
  keyGenerator: (req) => getRealIp(req),
  // Skip SSE — long-lived connections must not consume rate limit tokens.
  // Skip authenticated requests — apiLimiter already handles per-user limits.
  //   NOTE: req.user is only set AFTER optionalAuth middleware, but globalLimiter
  //   runs BEFORE optionalAuth. So this check only works for routes where auth is
  //   applied earlier. Admin API paths are exempted explicitly below.
  // Skip static assets — not abuse vectors; they exhaust the IP budget on
  // asset-heavy pages (admin panel loads 20+ JS files per page).
  // Skip admin API paths — requireAdmin middleware already gates these; the global
  // limiter was causing 429s on admin panel load (20+ API calls in quick succession)
  // which cascaded into failed silentRefresh → 401 → redirect to /login.
  // Skip auth refresh — silentRefresh POSTs here; 429 leaves the access token expired,
  // and the next API call gets a server-side 401 → redirect to /login.
  skip: (req) =>
    !ENABLED ||
    req.path === '/api/events' ||
    req.path.startsWith('/api/events') ||
    req.path.startsWith('/api/admin') ||
    req.path === '/api/auth/refresh' ||
    (req.user && req.user.id) ||
    STATIC_EXT_RE.test(req.path),
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(429).json({ error: 'För många förfrågningar. Vänta en stund och försök igen.' });
  },
});

/**
 * Login limiter: 5 failed attempts per IP per 15 min.
 * skipSuccessfulRequests means only failed logins count toward the limit.
 */
const loginLimiter = rateLimit({
  windowMs: config.rateLimits.login.windowMs,
  max: ENABLED ? config.rateLimits.login.max : 0,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'För många inloggningsförsök. Vänta 15 minuter och försök igen.' },
  keyGenerator: (req) => getRealIp(req),
  skipSuccessfulRequests: true,
  skip: () => !ENABLED,
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    const retryAfterSec = Math.ceil(options.windowMs / 1000);
    res
      .set('Retry-After', String(retryAfterSec))
      .status(429)
      .json({
        error: `För många inloggningsförsök. Försök igen om ${Math.ceil(retryAfterSec / 60)} minuter.`,
        retry_after: retryAfterSec,
      });
  },
});

/**
 * Child login limiter: same config as loginLimiter but isolated bucket.
 * Key: 'child-login:{ip}' — separate from parent login so wrong child PIN
 * doesn't block parent email login and vice versa.
 */
const childLoginLimiter = rateLimit({
  windowMs: config.rateLimits.login.windowMs,
  max: ENABLED ? config.rateLimits.login.max : 0,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'För många inloggningsförsök. Vänta 15 minuter och försök igen.' },
  keyGenerator: (req) => `child-login:${getRealIp(req)}`,
  skipSuccessfulRequests: true,
  skip: () => !ENABLED,
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    const retryAfterSec = Math.ceil(options.windowMs / 1000);
    res
      .set('Retry-After', String(retryAfterSec))
      .status(429)
      .json({
        error: `För många inloggningsförsök. Försök igen om ${Math.ceil(retryAfterSec / 60)} minuter.`,
        retry_after: retryAfterSec,
      });
  },
});

/**
 * Registration limiter: 3 registrations per hour per IP.
 */
const registrationLimiter = rateLimit({
  windowMs: config.rateLimits.registration.windowMs,
  max: ENABLED ? config.rateLimits.registration.max : 0,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'För många registreringsförsök. Försök igen senare.' },
  keyGenerator: (req) => getRealIp(req),
  skip: () => !ENABLED,
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    const retryAfterSec = Math.ceil(options.windowMs / 1000);
    res
      .set('Retry-After', String(retryAfterSec))
      .status(429)
      .json({
        error: 'För många registreringsförsök. Försök igen om en timme.',
        retry_after: retryAfterSec,
      });
  },
});

/**
 * Invite limiter: max 5 invites per family per hour.
 * Key: familyId from authenticated user.
 */
const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: ENABLED ? 5 : 0,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `invite-family:${req.user?.familyId || getRealIp(req)}`,
  skip: () => !ENABLED,
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(429).json({ error: 'För många inbjudningar. Försök igen om en timme.' });
  },
});

/**
 * Forgot-password limiter: max 3 reset requests per email per hour.
 * Key: normalized email from request body, falling back to IP.
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: ENABLED ? 3 : 0,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email;
    if (email && typeof email === 'string') return `reset-email:${email.toLowerCase().trim()}`;
    return `reset-ip:${getRealIp(req)}`;
  },
  skip: () => !ENABLED,
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(429).json({ error: 'För många försök. Försök igen om en timme.' });
  },
});

/**
 * Per-user API limiter: 100 req/min for authenticated users, 30 req/min for unauthenticated IPs.
 * Key: userId from JWT if present, otherwise IP.
 * SSE is explicitly skipped.
 *
 * NOTE: This is applied per-user so a family on a shared IP won't throttle each other.
 * Each parent/child account gets their own 100 req/min bucket.
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimits.apiAuthenticated.windowMs, // same window for both tiers
  max: (req) => {
    if (!ENABLED) return 0; // 0 = unlimited
    // If we have a decoded user (set by auth middleware), use higher authenticated limit
    if (req.user && req.user.id) return config.rateLimits.apiAuthenticated.max;
    return config.rateLimits.apiUnauthenticated.max;
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key: userId for authenticated, IP for unauthenticated
  keyGenerator: (req) => {
    if (req.user && req.user.id) return `user:${req.user.id}`;
    return `ip:${getRealIp(req)}`;
  },
  // Skip SSE — long-lived connections must not consume rate limit tokens.
  // Skip authenticated users — apiLimiter uses per-user keys (user:parentId) so
  // authenticated users already have their own 100 req/min bucket. GlobalLimiter also
  // has its own skip for these. Without this skip, authenticated admin requests could
  // hit the 30 req/min unauthenticated limit when IP budget is exhausted (e.g. after
  // loading many static files), causing 429 → infinite loading on admin pages.
  skip: (req) =>
    !ENABLED ||
    (req.user && req.user.id) ||  // skip authenticated users
    req.path === '/events' ||
    req.path.startsWith('/events') ||
    req.originalUrl?.startsWith('/api/events'),
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    const retryAfterSec = Math.ceil(options.windowMs / 1000);
    res
      .set('Retry-After', String(retryAfterSec))
      .status(429)
      .json({
        error: 'För många förfrågningar. Vänta en minut och försök igen.',
        retry_after: retryAfterSec,
      });
  },
});

/**
 * Apple Sign In limiter: max 10 attempts per IP per hour.
 * Protects against token enumeration and replay attacks.
 */
const appleLoginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: ENABLED ? 10 : 0,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getRealIp(req),
  skip: () => !ENABLED,
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    const retryAfterSec = Math.ceil(options.windowMs / 1000);
    res.status(429).json({
      error: 'För många Apple-inloggningsförsök. Försök igen om en timme.',
      retry_after: retryAfterSec,
    });
  },
});

/**
 * Resend verification limiter: max 3 per hour per email.
 * DB-based rate limiting is the primary control (handles multi-instance).
 * This in-memory limiter provides defence-in-depth per IP.
 */
const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: ENABLED ? 3 : 0,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email;
    if (email && typeof email === 'string') return `verify-resend:${email.toLowerCase().trim()}`;
    return `verify-resend-ip:${getRealIp(req)}`;
  },
  skip: () => !ENABLED,
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(429).json({ error: 'Du har redan begärt flera verifieringslänkar. Försök igen om en timme.' });
  },
});

/**
 * Parent PIN verify limiter: 5 attempts per family per 15 min.
 * Protects against brute-force on the 4-digit parent PIN.
 * Key: familyId for authenticated parents (auth required for all family/* endpoints).
 */
const parentPinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: ENABLED ? 5 : 0,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `parent-pin:${req.user?.familyId || getRealIp(req)}`,
  skip: () => !ENABLED,
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    const retryAfterSec = Math.ceil(options.windowMs / 1000);
    res.status(429).json({
      error: 'För många försök. Försök igen om 15 minuter.',
      retry_after: retryAfterSec,
    });
  },
});

/**
 * IAP webhook limiter: 100 req/min for RevenueCat webhook endpoint.
 * Keyed by IP — webhook has no session cookie.
 */
const iapWebhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getRealIp(req),
  skip: () => !ENABLED,
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    const retryAfterSec = Math.ceil(options.windowMs / 1000);
    res
      .set('Retry-After', String(retryAfterSec))
      .status(429)
      .json({ error: 'För många förfrågningar. Vänta en minut och försök igen.', retry_after: retryAfterSec });
  },
});

module.exports = {
  globalLimiter,
  loginLimiter,
  childLoginLimiter,
  registrationLimiter,
  apiLimiter,
  inviteLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter,
  appleLoginLimiter,
  iapWebhookLimiter,
  parentPinLimiter,
};
