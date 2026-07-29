'use strict';

/**
 * Parent PIN (Föräldralås) + login-picker session routes.
 * Mounted at /api/family AFTER router.use(requireParent) in index.js, so every
 * route here inherits the parent gate (with its child→parent cookie restore).
 * Individual routes keep their original explicit middleware unchanged.
 *
 * Cookie/session side-effects live here (endpoint-map R3): keep paths, maxAge,
 * and sameSite exactly as-is.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../../lib/db');
const config = require('../../lib/config');
const { requireParent, requireAuth, resolveParentIdForLoginPicker, verifyToken } = require('../../middleware/auth');
const { generateCsrfToken } = require('../../middleware/csrf');
const { parentPinLimiter } = require('../../middleware/rateLimiter');
const parentPinDb = require('../../../db/parent-pin');
const { activateParentSessionCookies } = require('../../lib/parent-session-cookies');

const router = express.Router();

/** Resolve parent + family from barnväljare (active parent JWT or stjarndag_parent_session). */
async function resolvePickerParentContext(req) {
  const parentId = resolveParentIdForLoginPicker(req);
  if (!parentId) return null;
  const parentResult = await db.query(
    `SELECT id, email, family_id, is_admin, onboarding_completed
     FROM parent WHERE id = $1`,
    [parentId]
  );
  const parentRow = parentResult.rows[0];
  if (!parentRow) return null;
  return {
    parentId: parentRow.id,
    familyId: parentRow.family_id,
    parent: parentRow,
  };
}

/** Attach req.user from barnväljare for rate limiting on picker PIN routes. */
async function attachPickerFamily(req, res, next) {
  try {
    const ctx = await resolvePickerParentContext(req);
    if (!ctx) {
      return res.status(401).json({ error: 'Ingen sparad vuxensession. Logga in som vuxen.' });
    }
    req.user = { id: ctx.parentId, familyId: ctx.familyId, type: 'parent' };
    next();
  } catch (err) {
    console.error('[FAMILY] attachPickerFamily error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
}

// ─── GET /api/family/parent-pin-status-picker ────────────────
// Barnväljare without active JWT — uses stjarndag_parent_session only.
router.get('/parent-pin-status-picker', async (req, res) => {
  try {
    const ctx = await resolvePickerParentContext(req);
    if (!ctx) {
      return res.json({ has_session: false, has_pin: false });
    }
    const hasPin = await parentPinDb.parentHasPin(ctx.parentId);
    res.json({
      has_session: true,
      has_pin: hasPin,
    });
  } catch (err) {
    console.error('[FAMILY] parent-pin-status-picker error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ─── POST /api/family/verify-pin-picker ────────────────────────
// Verify parent PIN from barnväljare (no active JWT) and restore parent session cookies.
router.post('/verify-pin-picker', attachPickerFamily, parentPinLimiter, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ error: 'PIN-kod krävs (4 siffror)' });
    }

    if (!(await parentPinDb.parentHasPin(req.user.id))) {
      return res.status(400).json({ error: 'Ingen PIN-kod satt för ditt konto' });
    }

    const { ok } = await parentPinDb.verifyParentPin({
      familyId: req.user.familyId,
      parentId: req.user.id,
      pin,
    });
    if (!ok) {
      return res.status(401).json({ ok: false, attempts_remaining: null });
    }

    const gateToken = jwt.sign(
      { type: 'gate', familyId: req.user.familyId, parentId: req.user.id },
      config.jwt.secret,
      { expiresIn: '15m' }
    );
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const ctx = await resolvePickerParentContext(req);
    activateParentSessionCookies(req, res);

    const csrfToken = generateCsrfToken(res);
    const p = ctx?.parent;

    res.json({
      ok: true,
      gateToken,
      expiresAt,
      csrfToken,
      parent: p ? {
        id: p.id,
        email: p.email || null,
        familyId: p.family_id,
        isAdmin: p.is_admin || false,
        type: 'parent',
        onboarding_completed: p.onboarding_completed,
      } : undefined,
    });
  } catch (err) {
    console.error('[FAMILY] verify-pin-picker error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ─── GET /api/family/parent-pin-status ───────────────────────
// Parent: own PIN. Child session: any adult in family has PIN (for "Jag är vuxen" gate).
// Why requireAuth (not requireParent): child-login.js calls this from a child session.
router.get('/parent-pin-status', requireAuth, async (req, res) => {
  try {
    let hasPin;
    if (req.user.type === 'parent') {
      hasPin = await parentPinDb.parentHasPin(req.user.id);
    } else {
      hasPin = await parentPinDb.familyAnyParentHasPin(req.user.familyId);
    }
    res.json({ has_pin: hasPin });
  } catch (err) {
    console.error('[FAMILY] parent-pin-status error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ─── POST /api/family/set-pin ──────────────────────────────────
// Set or change the logged-in adult's own parent PIN.
// First set: { pin, confirmPin }
// Change (with current PIN): { pin, confirmPin, currentPin }
// Change (PIN forgotten): { pin, confirmPin, password }
router.post('/set-pin', requireParent, async (req, res) => {
  try {
    const { pin, confirmPin, currentPin, password } = req.body;

    // Validate: exactly 4 digits
    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ error: 'PIN-koden måste vara exakt 4 siffror' });
    }
    if (pin !== confirmPin) {
      return res.status(400).json({ error: 'PIN-koderna matchar inte' });
    }

    const pinRow = await parentPinDb.getParentPinRow(req.user.id);

    if (pinRow?.parent_pin_hash) {
      // ── Changing existing PIN ──────────────────────────────
      if (!currentPin && !password) {
        return res.status(400).json({ error: 'Ange nuvarande PIN-kod eller lösenord för att ändra' });
      }

      if (currentPin) {
        const pinOk = await require('../../lib/hash').comparePassword(currentPin, pinRow.parent_pin_hash);
        if (!pinOk) {
          return res.status(401).json({ error: 'Felaktig nuvarande PIN-kod' });
        }
      } else {
        const parentResult = await db.query(
          'SELECT password_hash FROM parent WHERE id = $1',
          [req.user.id]
        );
        if (!parentResult.rows[0]?.password_hash) {
          return res.status(400).json({ error: 'Kontot saknar lösenord — ange nuvarande PIN-kod' });
        }
        const pwOk = await require('../../lib/hash').comparePassword(password, parentResult.rows[0].password_hash);
        if (!pwOk) {
          return res.status(401).json({ error: 'Felaktigt lösenord' });
        }
      }
    }
    // First-time setup: no additional verification needed (requireParent already verified)

    const newHash = await require('../../lib/hash').hashPassword(pin);
    await parentPinDb.setParentPinHash(req.user.id, newHash);

    res.json({ success: true });
  } catch (err) {
    console.error('[FAMILY] set-pin error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen.' });
  }
});

// ─── POST /api/family/verify-pin ──────────────────────────────
// Verify parent PIN and return a short-lived gate token (15 min JWT).
// Parent session: own PIN. Child session: any adult's PIN in the family.
// Why requireAuth (not requireParent): child-login.js PIN overlay calls this from child JWT.
router.post('/verify-pin', parentPinLimiter, requireAuth, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN-kod krävs (4 siffror)' });
    }

    const familyId = req.user.familyId;
    const isParent = req.user.type === 'parent';

    const hasPin = isParent
      ? await parentPinDb.parentHasPin(req.user.id)
      : await parentPinDb.familyAnyParentHasPin(familyId);

    if (!hasPin) {
      return res.status(400).json({
        error: isParent ? 'Ingen PIN-kod satt för ditt konto' : 'Ingen vuxen har satt PIN-kod ännu',
      });
    }

    const { ok, parentId: matchedParentId } = await parentPinDb.verifyParentPin({
      familyId,
      parentId: isParent ? req.user.id : undefined,
      pin,
    });
    if (!ok) {
      return res.status(401).json({ ok: false, attempts_remaining: null });
    }

    const gateParentId = matchedParentId || (isParent ? req.user.id : null);
    const gateToken = jwt.sign(
      { type: 'gate', familyId, parentId: gateParentId },
      config.jwt.secret,
      { expiresIn: '15m' }
    );
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    res.json({ ok: true, gateToken, expiresAt });
  } catch (err) {
    console.error('[FAMILY] verify-pin error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ─── POST /api/family/restore-parent-session ────────────────────
// Verify gateToken and restore the saved parent session cookies.
// Called after child logout when a parent session was saved.
router.post('/restore-parent-session', async (req, res) => {
  try {
    const { gateToken } = req.body;
    if (!gateToken) {
      return res.status(400).json({ error: 'gateToken krävs' });
    }

    let payload;
    try {
      payload = verifyToken(gateToken);
    } catch {
      return res.status(401).json({ error: 'Sessionen har gått ut. Ange PIN-koden igen.' });
    }

    if (payload.type !== 'gate') {
      return res.status(401).json({ error: 'Ogiltig sessionstoken.' });
    }

    const parentSessionCookie = req.cookies?.stjarndag_parent_session;
    if (!parentSessionCookie) {
      return res.status(401).json({ error: 'Ingen sparad session hittades. Logga in igen.' });
    }

    let session;
    try {
      session = JSON.parse(Buffer.from(parentSessionCookie, 'base64').toString('utf8'));
    } catch {
      return res.status(401).json({ error: 'Ogiltig session.' });
    }

    if (!session?.access_token || !session?.refresh_token) {
      return res.status(401).json({ error: 'Saknad session. Logga in igen.' });
    }

    res.cookie('access_token', session.access_token, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', session.refresh_token, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });
    res.clearCookie('stjarndag_parent_session', { path: '/' });

    res.json({ restored: true, expiresAt: payload.exp });
  } catch (err) {
    console.error('[FAMILY] restore-parent-session error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

module.exports = router;
