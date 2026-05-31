/**
 * Auth middleware.
 * Owns: JWT verification, token extraction from header/cookie/query.
 * Does NOT own: token issuance, refresh token management (those are in routes/auth.js).
 *
 * Dual-secret support: if JWT_SECRET_PREVIOUS is set, tokens signed with the old key
 * are still accepted until they expire naturally. New tokens are always signed with JWT_SECRET.
 */
const jwt = require('jsonwebtoken');
const config = require('../lib/config');

/**
 * Try to verify a JWT with the current secret, then fall back to the previous secret.
 * Returns the decoded payload or throws if neither secret works.
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (primaryErr) {
    // Only try previous secret if it's configured — this is for zero-downtime key rotation.
    if (config.jwt.previousSecret) {
      try {
        return jwt.verify(token, config.jwt.previousSecret);
      } catch {
        // Throw the original error for consistent messaging
        throw primaryErr;
      }
    }
    throw primaryErr;
  }
}

/**
 * Verify JWT token from Authorization header, httpOnly cookie, or query param.
 * Sets req.user = { id, type, familyId, email/username }
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Autentisering krävs' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Ogiltig eller utgången token' });
  }
}

/**
 * Require parent auth (not child).
 * When a parent navigates to a parent-only page while logged in as a child
 * (child-login overwrites httpOnly cookies), this restores the saved parent
 * session from stjarndag_parent_session before rejecting.
 */
function requireParent(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.type === 'parent') return next();

    // Parent reached a parent-only page with an active child token.
    // Restore the saved parent session from stjarndag_parent_session cookie.
    const saved = req.cookies?.stjarndag_parent_session;
    if (saved) {
      try {
        const session = JSON.parse(Buffer.from(saved, 'base64').toString('utf8'));
        if (session?.access_token) {
          // Swap child cookie for parent cookie — requireAuth will re-parse on next tick
          req.cookies.access_token = session.access_token;
          req.cookies.refresh_token = session.refresh_token;
          // Re-verify as parent
          const decoded = verifyToken(session.access_token);
          if (decoded.type === 'parent') {
            req.user = decoded;
            return next();
          }
        }
      } catch {
        // Corrupt cookie or bad token — fall through to reject
      }
    }

    console.warn(
      `[AUTH] requireParent rejected — type=${req.user.type} id=${req.user.id} path=${req.method} ${req.originalUrl}`
    );
    return res.status(403).json({ error: 'Förbjuden — kräver föräldrabehörighet' });
  });
}

/**
 * Require admin auth.
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.type !== 'parent' || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Förbjuden — kräver administratörsbehörighet' });
    }
    next();
  });
}

/**
 * Require child auth.
 */
function requireChild(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.type !== 'child') {
      return res.status(403).json({ error: 'Förbjuden — kräver barninloggning' });
    }
    next();
  });
}

/**
 * Optional auth — sets req.user if token is valid, continues regardless.
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    req.user = verifyToken(token);
  } catch {
    // Invalid token — just continue without user
  }
  next();
}

/**
 * Extract JWT from Authorization header, httpOnly cookie, or ?token= query param.
 * Priority: header > cookie > query param.
 * Query param is only used for SSE (EventSource cannot send headers).
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // httpOnly secure cookie (set by login endpoint)
  if (req.cookies?.access_token) {
    return req.cookies.access_token;
  }

  // Legacy: plain 'token' cookie (backwards compat — may be present on old sessions)
  if (req.cookies?.token) {
    return req.cookies.token;
  }

  // Query param fallback for SSE (EventSource cannot set custom headers)
  if (req.query?.token) {
    return req.query.token;
  }

  return null;
}

/**
 * Restore parent session when user is logged in as a child.
 *
 * When a parent logs in as a child, the child-login endpoint saves the parent session
 * in the `stjarndag_parent_session` cookie (base64 JSON of { access_token, refresh_token }).
 * This middleware runs on all /api/* routes and restores the parent session when:
 *   - Current user is a child (child token found in access_token cookie)
 *   - A saved parent session exists in stjarndag_parent_session
 *
 * This fixes the bug where child login overwrites the parent's httpOnly cookies,
 * causing the parent dashboard to show "Inga barn" after returning from child view.
 *
 * IMPORTANT: This modifies req.cookies so that downstream requireAuth reads the
 * restored parent token instead of the child token.
 */
function restoreParentSession(req, res, next) {
  const sessionCookie = req.cookies?.stjarndag_parent_session;
  if (!sessionCookie) return next();

  let session;
  try {
    session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf8'));
  } catch {
    return next();
  }

  if (!session?.access_token || !session?.refresh_token) return next();

  // Only restore if current user is a child (parent session is intact — no-op)
  const currentToken = req.cookies?.access_token;
  if (!currentToken) return next();

  let currentIsValidChild = false;
  try {
    const decoded = jwt.verify(currentToken, config.jwt.secret, {
      algorithms: ['HS256'],
    });
    if (decoded.type !== 'child') return next();
    // Child token is valid — child auth takes precedence, do NOT override
    currentIsValidChild = true;
  } catch {
    // Child token is invalid/expired/rotated-key — try previous secret before giving up.
    // An expired child token should not destroy the saved parent session.
    if (config.jwt.previousSecret) {
      try {
        const decoded = jwt.verify(currentToken, config.jwt.previousSecret, {
          algorithms: ['HS256'],
        });
        if (decoded.type === 'child') {
          currentIsValidChild = true;
        }
      } catch {
        // Still invalid — fall through to restore parent session
      }
    }
    if (!currentIsValidChild) {
      // Token is null, invalid, or not a child token.
      // Parent session restoration is NOT safe here — the current token may be
      // a fresh parent/admin session that just happens to be unreadable locally
      // (e.g., privacy mode, localStorage cleared). Let optionalAuth handle it.
      return next();
    }
  }

  // Current child token is valid — skip parent session restoration so child auth succeeds.
  // The parent session cookie is preserved so it can be restored on logout or when the
  // child navigates to parent-facing pages.
  if (currentIsValidChild) return next();

  // Current user is a child AND we have a saved parent session → restore it
  req.cookies.access_token = session.access_token;
  req.cookies.refresh_token = session.refresh_token;
  next();
}

module.exports = {
  requireAuth,
  requireParent,
  requireAdmin,
  requireChild,
  optionalAuth,
  verifyToken,
  extractToken,
  restoreParentSession,
};
