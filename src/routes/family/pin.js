'use strict';

const { sendApiError } = require('../../lib/api-user-error');

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
const { requireParent, requireAuth, verifyToken } = require('../../middleware/auth');
const { generateCsrfToken } = require('../../middleware/csrf');
const { parentPinLimiter } = require('../../middleware/rateLimiter');
const parentPinDb = require('../../../db/parent-pin');
const { activateParentSessionCookies } = require('../../lib/parent-session-cookies');

const router = express.Router();

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
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
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
      return sendApiError(res, 400, 'VALIDATION_PIN_4_DIGITS');
    }
    if (pin !== confirmPin) {
      return sendApiError(res, 400, 'PIN_CONFIRM_MISMATCH');
    }

    const pinRow = await parentPinDb.getParentPinRow(req.user.id);

    if (pinRow?.parent_pin_hash) {
      // ── Changing existing PIN ──────────────────────────────
      if (!currentPin && !password) {
        return sendApiError(res, 400, 'PIN_OR_PASSWORD_REQUIRED');
      }

      if (currentPin) {
        const pinOk = await require('../../lib/hash').comparePassword(currentPin, pinRow.parent_pin_hash);
        if (!pinOk) {
          return sendApiError(res, 401, 'INVALID_CURRENT_PIN');
        }
      } else {
        const parentResult = await db.query(
          'SELECT password_hash FROM parent WHERE id = $1',
          [req.user.id]
        );
        if (!parentResult.rows[0]?.password_hash) {
          return sendApiError(res, 400, 'PIN_REQUIRED_NO_PASSWORD');
        }
        const pwOk = await require('../../lib/hash').comparePassword(password, parentResult.rows[0].password_hash);
        if (!pwOk) {
          return sendApiError(res, 401, 'INVALID_PASSWORD');
        }
      }
    }
    // First-time setup: no additional verification needed (requireParent already verified)

    const newHash = await require('../../lib/hash').hashPassword(pin);
    await parentPinDb.setParentPinHash(req.user.id, newHash);

    res.json({ success: true });
  } catch (err) {
    console.error('[FAMILY] set-pin error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
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
      return sendApiError(res, 400, 'PIN_REQUIRED');
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
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

// ─── POST /api/family/restore-parent-session ────────────────────
// Verify gateToken and restore the saved parent session cookies.
// Called after child logout when a parent session was saved.
router.post('/restore-parent-session', async (req, res) => {
  try {
    const { gateToken } = req.body;
    if (!gateToken) {
      return sendApiError(res, 400, 'GATE_TOKEN_REQUIRED');
    }

    let payload;
    try {
      payload = verifyToken(gateToken);
    } catch {
      return sendApiError(res, 401, 'GATE_SESSION_EXPIRED');
    }

    if (payload.type !== 'gate') {
      return res.status(401).json({ error: 'Ogiltig sessionstoken.' });
    }

    const parentSessionCookie = req.cookies?.stjarndag_parent_session;
    if (!parentSessionCookie) {
      return res.status(401).json({ error: 'Ingen sparad session hittades. Logga in igen.' });
    }

    const restored = await activateParentSessionCookies(req, res);
    if (!restored.ok) {
      return res.status(401).json({ error: 'Ingen sparad session hittades. Logga in igen.', code: restored.code });
    }

    res.json({ restored: true, expiresAt: payload.exp });
  } catch (err) {
    console.error('[FAMILY] restore-parent-session error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

module.exports = router;
