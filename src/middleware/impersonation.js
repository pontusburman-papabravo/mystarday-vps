// Impersonation middleware
// Owns: blocking write operations during admin support sessions.
// Does NOT own: JWT verification (handled by auth.js) or auth state.
const db = require('../lib/db');
const { extractToken, verifyToken } = require('./auth');

/**
 * blockImpersonationWrites — applied globally on /api/* routes.
 * Independently decodes the JWT (no dependency on req.user being set).
 * If the token is an impersonation token, all non-GET requests return 403
 * and the blocked attempt is logged to admin_audit_log.
 */
async function blockImpersonationWrites(req, res, next) {
  // Only block write methods — let reads through immediately
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Extract and decode token
  const token = extractToken(req);

  if (!token) return next();

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    // Invalid token — let auth middleware handle the 401
    return next();
  }

  // Not an impersonation token — allow normally
  if (!decoded.isImpersonation) return next();

  // Log the blocked write attempt
  try {
    await db.query(
      `INSERT INTO admin_audit_log (admin_id, target_family_id, action, metadata)
       VALUES ($1, $2, 'impersonate_write_blocked', $3)`,
      [
        decoded.impersonatedBy,
        decoded.familyId,
        JSON.stringify({
          method: req.method,
          path: req.path,
          ip: req.ip,
        }),
      ]
    );
  } catch (logErr) {
    // Log failure must not block the 403 response
    console.error('[IMPERSONATION] Audit log write failed:', logErr);
  }

  return res.status(403).json({
    error: 'Skrivåtgärder är inaktiverade i support-läge',
    code: 'IMPERSONATION_WRITE_BLOCKED',
  });
}

module.exports = { blockImpersonationWrites };
