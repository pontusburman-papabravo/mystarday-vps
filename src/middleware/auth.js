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
const {
  applyHandoffToRequestCookies,
  resolveParentIdFromHandoff,
} = require('../lib/parent-session-handoff');
const { reconcileChildSessionCookies } = require('../lib/session-cookie-reconcile');
const { sanitizeRefreshTokenCookie } = require('../lib/refresh-tokens');
const { isEscalatedParentExpired } = require('../lib/adult-privilege-escalation');

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
    if (req.user.type === 'parent') {
      if (isEscalatedParentExpired(req.user)) {
        return res.status(403).json({
          error: 'Förbjuden — vuxenprivilegiet har gått ut',
          code: 'ADULT_PRIVILEGE_EXPIRED',
        });
      }
      return next();
    }

    applyHandoffToRequestCookies(req, res)
      .then((applied) => {
        if (applied) {
          try {
            const decoded = verifyToken(req.cookies.access_token);
            if (decoded.type === 'parent') {
              req.user = decoded;
              return next();
            }
          } catch {
            /* fall through */
          }
        }

        console.warn(
          `[AUTH] requireParent rejected — type=${req.user.type} id=${req.user.id} path=${req.method} ${req.originalUrl}`
        );
        return res.status(403).json({ error: 'Förbjuden — kräver föräldrabehörighet' });
      })
      .catch(next);
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
 * When a parent logs in as a child, the child-login endpoint stores an opaque
 * handoff in `stjarndag_parent_session` (server-side row + refresh_token_id).
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
async function restoreParentSession(req, res, next) {
  sanitizeRefreshTokenCookie(req, res);

  if (
    req.method === 'POST'
    && (req.path === '/api/auth/logout' || req.originalUrl?.startsWith('/api/auth/logout'))
  ) {
    return next();
  }

  try {
    const childSync = await reconcileChildSessionCookies(req, res);
    if (childSync.reconciled || childSync.alreadyChild) {
      return next();
    }
  } catch (err) {
    return next(err);
  }

  if (!req.cookies?.stjarndag_parent_session) return next();

  const currentToken = req.cookies?.access_token;
  if (!currentToken) return next();

  let currentIsValidChild = false;
  try {
    const decoded = jwt.verify(currentToken, config.jwt.secret, {
      algorithms: ['HS256'],
    });
    if (decoded.type !== 'child') return next();
    currentIsValidChild = true;
  } catch {
    if (config.jwt.previousSecret) {
      try {
        const decoded = jwt.verify(currentToken, config.jwt.previousSecret, {
          algorithms: ['HS256'],
        });
        if (decoded.type === 'child') currentIsValidChild = true;
      } catch {
        /* fall through */
      }
    }
  }

  if (currentIsValidChild) return next();

  try {
    await applyHandoffToRequestCookies(req, res);
  } catch (err) {
    return next(err);
  }
  next();
}

/**
 * When a valid child JWT is in the cookie but the caller hits a parent API,
 * restore req.user from stjarndag_parent_session for this request only.
 * Used by childParentApiBlock (runs before route-level requireParent).
 */
async function restoreParentUserFromCookie(req, res) {
  const applied = await applyHandoffToRequestCookies(req, res);
  if (!applied) return false;
  try {
    const decoded = verifyToken(req.cookies.access_token);
    if (decoded.type !== 'parent') return false;
    req.user = decoded;
    return true;
  } catch {
    return false;
  }
}

/**
 * Parent id for barnväljaren — aktiv vuxensession eller sparad stjarndag_parent_session.
 */
async function resolveParentIdForLoginPicker(req, res) {
  const token = extractToken(req);
  if (token) {
    try {
      const decoded = verifyToken(token);
      if (decoded.type === 'parent') return decoded.id;
    } catch {
      /* fall through */
    }
  }
  return await resolveParentIdFromHandoff(req, res);
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
  restoreParentUserFromCookie,
  resolveParentIdForLoginPicker,
  reconcileChildSessionCookies,
};
