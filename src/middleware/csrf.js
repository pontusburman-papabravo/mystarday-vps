/**
 * CSRF protection middleware.
 * Owns: double-submit cookie pattern for all state-changing endpoints.
 * Does NOT own: session management, JWT auth.
 *
 * Pattern: double-submit cookie.
 *   1. GET /api/auth/csrf-token → generates a random token, sets it in a readable cookie
 *      (csrf_token, NOT httpOnly so JS can read it) and returns it in JSON.
 *   2. All POST/PUT/PATCH/DELETE requests must include the token in the X-CSRF-Token header.
 *   3. Middleware compares header value against cookie value — mismatch = 403.
 *
 * Why this works: a cross-origin attacker can send cookies automatically but cannot
 * read the cookie value (same-origin policy), so they cannot supply the matching header.
 *
 * Exclusions:
 *   - GET, HEAD, OPTIONS are read-only — no CSRF needed.
 *   - /api/auth/login, /api/auth/register, /api/auth/child-login, /api/auth/verify-email,
 *     /api/auth/resend-verification, /api/auth/forgot-password, /api/auth/reset-password,
 *     /api/auth/refresh — these
 *     endpoints initiate or complete auth flows where CSRF doesn't apply (no session yet,
 *     or the operation is explicitly user-initiated with a one-time token).
 */
const crypto = require('crypto');

// Safe methods: no CSRF needed
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Auth bootstrap endpoints: excluded from CSRF (no existing session to protect).
// Paths use the STRIPPED form (without the /api mount prefix) because Express
// strips req.baseUrl from req.path when middleware is mounted via app.use('/api', ...).
const CSRF_EXEMPT_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/child-login',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
  '/auth/logout',
  '/auth/csrf-token',
  // Apple Sign In: idToken is the auth credential — same principle as /auth/login
  '/auth/apple',
  '/auth/apple/link',
  // Invite accept-new: public endpoint — creates account from invite token, no prior session
  '/family/invite/accept-new',
  // Public data endpoints that don't mutate user state
  '/contact',
  '/feedback',
  '/consent',
  // Public waitlist form — no session, no auth; CSRF not applicable
  '/waitlist',
  '/waitlist/survey',
  '/waitlist/skip',
  // Public professional interest form — no session
  '/public/professional-interest',
  // Email change confirm: user is not logged in when clicking the link
  '/account/change-email/confirm',
]);

// Prefix-based exemptions for public endpoints with dynamic segments.
// Survey respondent endpoints are anonymous (no session) — CSRF not applicable.
const CSRF_EXEMPT_PREFIXES = [
  '/surveys/s/',          // POST /surveys/s/:slug/start
  '/surveys/responses/',  // POST /surveys/responses/:rid/answers, /submit
  '/surveys/popup/',            // POST /surveys/popup/interaction — user-initiated from own session
  '/messages/',           // PUT /messages/:id/read — authenticated via session cookie; CSRF redundant
  '/public/report/',      // PIN submission for public report; no parent session, CSRF not applicable
];

/**
 * Set a fresh CSRF token cookie. Called from GET /api/auth/csrf-token.
 */
function generateCsrfToken(res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf_token', token, {
    httpOnly: false,   // Must be readable by JS so client can set the header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24h — refreshed on each CSRF token request
    path: '/',
  });
  return token;
}

/**
 * CSRF enforcement middleware.
 * Attach to the app BEFORE API routes.
 */
function csrfProtect(req, res, next) {
  // Safe methods don't need CSRF
  if (SAFE_METHODS.has(req.method)) return next();

  // Exempt specific auth bootstrap paths (paths are already stripped of /api prefix by Express)
  if (CSRF_EXEMPT_PATHS.has(req.path)) return next();

  // Exempt prefix-matched public endpoints (dynamic segments like :slug, :rid)
  if (CSRF_EXEMPT_PREFIXES.some(prefix => req.path.startsWith(prefix))) return next();

  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: 'CSRF-token saknas', code: 'CSRF_MISSING' });
  }

  // Constant-time comparison prevents timing attacks
  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);

  if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
    return res.status(403).json({ error: 'Ogiltig CSRF-token', code: 'CSRF_INVALID' });
  }

  next();
}

module.exports = { csrfProtect, generateCsrfToken };
