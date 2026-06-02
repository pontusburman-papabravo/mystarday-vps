/**
 * Application configuration.
 * All rate limiting values are configurable via environment variables.
 *
 * JWT_SECRET is REQUIRED in production. The app will crash at startup
 * without it — this is intentional. Never ship a hardcoded fallback.
 */

// ─── JWT_SECRET validation (fail-fast in production) ─────
const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be set in production');
}
if (isProd && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  throw new Error('FATAL: JWT_SECRET must be at least 32 characters in production');
}

// Non-production: allow POLSIA_API_TOKEN fallback for local dev/CI.
// The old hardcoded fallback was removed — it was a security risk.
const jwtSecret = process.env.JWT_SECRET || process.env.POLSIA_API_TOKEN || (() => {
  if (isProd) throw new Error('FATAL: JWT_SECRET must be set in production');
  return 'dev-only-not-for-production';
})();

// Log secret length at startup (NEVER log the actual value)
console.log(`JWT_SECRET configured: length=${process.env.JWT_SECRET?.length || 'NOT SET (using dev fallback)'}`);

module.exports = {
  jwt: {
    // Current signing secret. Rotate by setting JWT_SECRET to a new value
    // and setting JWT_SECRET_PREVIOUS to the old value — both will be accepted
    // for verification, but new tokens are only signed with JWT_SECRET.
    secret: jwtSecret,
    previousSecret: process.env.JWT_SECRET_PREVIOUS || null,

    // Short-lived access token (15 min default).
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',

    // Child access token: 8h session (child logs in morning, session lasts the day)
    childExpiresIn: process.env.JWT_CHILD_EXPIRES_IN || '8h',
  },

  refreshToken: {
    // Refresh token lifetime in days. Default 30 so users stay logged in
    // when they close the PWA and return days later (access token cookie is
    // also 30d so refresh works on next open).
    expiryDays: parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS) || 30,
  },

  rateLimits: {
    // Master kill switch — set RATE_LIMIT_ENABLED=false to disable all rate limiting
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',

    // Global: 200 req/min per IP (generous — covers family with 4 devices on shared IP)
    global: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
      max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
    },
    // Authenticated API: 100 req/min per user ID
    apiAuthenticated: {
      windowMs: parseInt(process.env.API_AUTH_RATE_LIMIT_WINDOW_MS) || 60_000,
      max: parseInt(process.env.API_AUTH_RATE_LIMIT_MAX) || 100,
    },
    // Unauthenticated API: 30 req/min per IP
    apiUnauthenticated: {
      windowMs: parseInt(process.env.API_UNAUTH_RATE_LIMIT_WINDOW_MS) || 60_000,
      max: parseInt(process.env.API_UNAUTH_RATE_LIMIT_MAX) || 30,
    },
    // Login: 5 failed attempts per IP per 15 min (brute-force protection)
    login: {
      windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60_000,
      max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
    },
    // Child PIN lockout: exponential backoff, DB-based per child_id + IP
    childPin: {
      // Max failed attempts before first lockout (spec: 3 failed attempts)
      maxAttempts: parseInt(process.env.MAX_PIN_ATTEMPTS) || 3,
      // Base lockout duration in seconds (spec: 30s first lockout)
      // Backoff: baseSeconds → 5× → 15×
      baseLockoutSeconds: parseInt(process.env.LOCKOUT_BASE_SECONDS) || 30,
      // Backward-compatible alias for older code paths.
      baseLockoutMinutes: parseInt(process.env.LOCKOUT_BASE_MINUTES) || 1,
    },
    // Legacy alias (used by old code path — kept for compat)
    childLogin: {
      windowMs: parseInt(process.env.CHILD_LOGIN_LOCKOUT_WINDOW_MS) || 15 * 60_000,
      max: parseInt(process.env.CHILD_LOGIN_LOCKOUT_MAX) || 3,
    },
    // Registration: 3 per hour per IP
    registration: {
      windowMs: parseInt(process.env.REGISTER_RATE_LIMIT_WINDOW_MS) || 60 * 60_000,
      max: parseInt(process.env.REGISTER_RATE_LIMIT_MAX) || 3,
    },
  },

  email: {
    from: process.env.EMAIL_FROM || 'info@mystarday.se',
    baseUrl: process.env.APP_URL || 'https://mystarday.se',
    // Max 1 PIN warning email per child per N minutes (prevents parent spam during lockout storm)
    pinEmailCooldownMinutes: parseInt(process.env.PIN_EMAIL_COOLDOWN_MINUTES) || 30,
  },

  // Note: password hashing uses scrypt (src/lib/hash.js), not bcrypt.

  verification: {
    tokenExpiryHours: parseInt(process.env.VERIFY_TOKEN_EXPIRY_HOURS) || 24,
    resetTokenExpiryHours: parseInt(process.env.RESET_TOKEN_EXPIRY_HOURS) || 1,
  },

  // Dedicated secret for PIN fingerprinting (HMAC-SHA256).
  // PIN fingerprints must be deterministic, so a single secret is needed.
  // Falls back to JWT_SECRET so existing fingerprints work after deploy.
  // Set PIN_FINGERPRINT_SECRET to rotate without breaking existing fingerprints.
  pin: {
    fingerprintSecret: process.env.PIN_FINGERPRINT_SECRET || jwtSecret,
  },
};
