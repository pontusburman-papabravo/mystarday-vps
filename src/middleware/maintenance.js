/**
 * Maintenance mode middleware — blocks non-admin traffic when enabled.
 * Owns: maintenance_mode feature flag check, admin bypass, maintenance HTML page.
 * Does NOT own: feature flag CRUD (that's in admin routes).
 */
const jwt = require('jsonwebtoken');
const config = require('../lib/config');
const db = require('../lib/db');
const { extractToken } = require('./auth');

let maintenanceCache = null;
let maintenanceCacheAt = 0;
const MAINTENANCE_CACHE_TTL = 5000; // 5 seconds

async function checkMaintenanceMode(req, res, next) {
  // Always allow health check and App Links / Universal Links verification
  if (req.path === '/health') return next();
  if (req.path.startsWith('/.well-known/')) return next();

  // Always allow admin login flow during maintenance
  const allowedPaths = ['/login', '/admin', '/api/auth/login', '/api/auth/me', '/verify-email', '/api/auth/verify-email', '/reset-password', '/api/auth/reset-password', '/api/auth/forgot-password', '/forgot-password'];
  if (allowedPaths.includes(req.path)) return next();

  // Allow static assets needed for login/admin pages and PWA
  if (req.path.startsWith('/js/') || req.path.startsWith('/css/')) return next();
  if (req.path.match(/\.(png|svg|ico|json|js)$/) || req.path === '/sw.js' || req.path === '/manifest.json' || req.path === '/offline.html') return next();

  const now = Date.now();
  if (!maintenanceCache || (now - maintenanceCacheAt) > MAINTENANCE_CACHE_TTL) {
    try {
      const result = await db.query(
        "SELECT enabled FROM feature_flag WHERE key = 'maintenance_mode' LIMIT 1"
      );
      maintenanceCache = result.rows.length > 0 ? result.rows[0].enabled : false;
      maintenanceCacheAt = now;
    } catch {
      maintenanceCache = false;
    }
  }

  if (!maintenanceCache) return next();

  // Maintenance mode ON — check if user is admin
  const token = extractToken(req);

  let isAdmin = false;
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      isAdmin = decoded.type === 'parent' && decoded.isAdmin === true;
    } catch {
      // invalid token — treat as non-admin
    }
  }

  if (isAdmin) return next();

  // Non-admin: show maintenance page
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(503).send(`
    <!DOCTYPE html>
    <html lang="sv">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Underhåll — Min Stjärndag</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #E8F0FE; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .card { background: white; border-radius: 20px; padding: 48px 40px; max-width: 480px; width: 90%; text-align: center; box-shadow: 0 4px 24px rgba(27,35,64,0.1); }
        .icon { font-size: 64px; margin-bottom: 24px; }
        h1 { font-family: 'Outfit', sans-serif; font-size: 28px; color: #1B2340; margin-bottom: 16px; }
        p { color: #5A6178; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
        .contact { font-size: 14px; color: #5A6178; }
        .contact a { color: #F5A623; text-decoration: none; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">&#9888;&#65039;</div>
        <h1>Vi genomför underhåll</h1>
        <p>Min Stjärndag är tillfälligt stängd för underhåll. Vi är snart tillbaka — tack för ditt tålamod!</p>
        <p class="contact">Frågor? Kontakta oss på <a href="mailto:info@mystarday.se">info@mystarday.se</a></p>
        <p style="margin-top: 48px;"><a href="/login" style="color: rgba(90,97,120,0.3); font-size: 12px; text-decoration: none;">Admin</a></p>
      </div>
    </body>
    </html>
  `);
}

module.exports = checkMaintenanceMode;
