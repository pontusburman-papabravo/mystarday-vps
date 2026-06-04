/**
 * Security headers middleware.
 * Owns: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, etc.
 * Does NOT own: CSRF protection (csrf.js), authentication (auth.js).
 *
 * Kill switch: SECURITY_HEADERS_ENABLED=false disables all headers.
 * Default: enabled.
 *
 * CSP is REPORT-ONLY — logs violations to CSP endpoint, never blocks.
 * Switch to enforce mode after verifying all external scripts.
 */

function securityHeadersMiddleware() {
  const ENABLED = process.env.SECURITY_HEADERS_ENABLED !== 'false';

  // CSP Report-Only: allows self + all external scripts currently in use.
  // Domains: Google Fonts, GA4/GTM, Meta Pixel, R2/CDN (image uploads).
  const r2Origin = (() => {
    try {
      const u = process.env.R2_PUBLIC_BASE_URL;
      return u ? ` ${new URL(u).origin}` : '';
    } catch { return ''; }
  })();
  const CSP_REPORT_ONLY = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://www.google-analytics.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://browser.sentry-cdn.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: https://www.facebook.com https://www.google-analytics.com https://mystarday.se${r2Origin}`,
    "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://www.facebook.com https://*.ingest.sentry.io https://oauth2.googleapis.com",
    "frame-ancestors 'none'",
  ].join('; ');

  return (req, res, next) => {
    if (!ENABLED) return next();
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // CSP in report-only mode — verify external scripts before switching to enforce
    res.setHeader('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY);
    next();
  };
}

module.exports = securityHeadersMiddleware;
