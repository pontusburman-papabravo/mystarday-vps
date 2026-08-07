/**
 * SSE (Server-Sent Events) endpoint.
 *
 * Owns: GET /api/events — one persistent connection per authenticated user.
 * Does NOT own: event emission logic (see src/lib/sse-broadcast.js).
 *
 * Authentication: httpOnly access_token cookie (primary) or Bearer header.
 * EventSource sends cookies automatically for same-origin requests.
 * The legacy ?token= query-param fallback was removed (N5) — query strings leak into
 * server/proxy logs and no active client (grep `EventSource(` in public/js/) used it.
 * Family isolation: events are scoped to the authenticated user's family_id.
 * Keep-alive: heartbeat ping every 15 seconds.
 */

const express = require('express');
const db = require('../lib/db');
const { verifyToken } = require('../middleware/auth');
const { addClient, removeClient } = require('../lib/sse-broadcast');
const { getEventScope } = require('../lib/sse-event-scope');
const { asyncHandler } = require('../middleware/asyncHandler');
const { getChildrenForParent } = require('../../db/parent-access');

const router = express.Router();

// ─── Auth: httpOnly cookie | Bearer header ────────────────
// Primary: httpOnly access_token cookie (sent automatically by browser).
// Fallback: Bearer header. No query-param fallback (N5 — removed, was a token-leak risk).

function extractUser(req) {
  // httpOnly cookie (primary — set by login endpoint as 'access_token')
  if (req.cookies?.access_token) {
    try { return verifyToken(req.cookies.access_token); } catch {}
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try { return verifyToken(authHeader.slice(7)); } catch {}
  }
  // Legacy cookie name
  if (req.cookies?.token) {
    try { return verifyToken(req.cookies.token); } catch {}
  }
  return null;
}

// ─── Resolve familyId for any user type ──────────────────

async function getFamilyId(user) {
  if (user.familyId) return user.familyId;

  if (user.type === 'parent') {
    const r = await db.query('SELECT family_id FROM parent WHERE id = $1', [user.id]);
    return r.rows[0]?.family_id || null;
  }
  if (user.type === 'child') {
    const r = await db.query('SELECT family_id FROM child WHERE id = $1', [user.id]);
    return r.rows[0]?.family_id || null;
  }
  return null;
}

// ─── GET /api/events ─────────────────────────────────────

router.get('/', asyncHandler(async (req, res) => {
  const user = extractUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Autentisering krävs' });
  }

  // getFamilyId throws on DB errors — asyncHandler forwards to error middleware.
  // If familyId is null (user not found), we send a 403 response before SSE headers.
  const familyId = await getFamilyId(user);
  if (!familyId) {
    return res.status(403).json({ error: 'Kunde inte bestämma familj' });
  }

  // SSE headers — response committed. After this, res.json() won't work.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx/Render proxy buffering

  res.flushHeaders();

  // Send initial handshake event
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ familyId })}\n\n`);

  let shouldDeliver = () => true;
  if (user.type === 'parent') {
    const children = await getChildrenForParent(user.id, { allowedRoles: ['primary', 'shared', 'pedagog'] });
    const allowedChildIds = new Set(children.map((c) => c.id));
    shouldDeliver = (type, data) => {
      const scope = getEventScope(type);
      const childId = data?.childId;
      if (scope === 'child') {
        if (!childId) return false;
        return allowedChildIds.has(childId);
      }
      return true;
    };
  } else if (user.type === 'child') {
    const ownId = user.id;
    shouldDeliver = (type, data) => {
      const scope = getEventScope(type);
      const childId = data?.childId;
      if (scope === 'child') {
        if (!childId) return false;
        return childId === ownId;
      }
      return true;
    };
  }

  addClient(familyId, res, {
    shouldDeliver,
    parentId: user.type === 'parent' ? user.id : null,
  });

  // Heartbeat every 15 seconds — keeps proxies from closing idle connections
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(familyId, res);
  });
}));

module.exports = router;
