'use strict';

/**
 * Adult privilege escalation — child session + saved handoff → parent JWT (server activate).
 * UI/biometric proof is client-side; parent API authority only after consumeHandoff here.
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../../middleware/auth');
const { generateCsrfToken } = require('../../middleware/csrf');
const { parentPinLimiter } = require('../../middleware/rateLimiter');
const parentPinDb = require('../../../db/parent-pin');
const { activateParentSessionCookies } = require('../../lib/parent-session-cookies');
const { evaluateHandoffForRequest, mapHandoffClientCode } = require('../../lib/parent-session-handoff');
const { isAdultPrivilegeEnabled } = require('../../lib/adult-privilege-flags');

const router = express.Router();

function handoffEvalToClientCode(evalResult) {
  if (evalResult.ok) return null;
  return mapHandoffClientCode(evalResult.reason || evalResult.code || 'missing');
}

function toParentSessionUser(parentRow) {
  return {
    id: parentRow.id,
    email: parentRow.email || null,
    familyId: parentRow.family_id,
    isAdmin: parentRow.is_admin || false,
    type: 'parent',
    onboarding_completed: parentRow.onboarding_completed,
  };
}

function decodeAccessExpiry(req) {
  const token = req.cookies?.access_token;
  if (!token) return null;
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return null;
    return decoded.exp * 1000;
  } catch {
    return null;
  }
}

async function requireAdultPrivilegeFlag(req, res, next) {
  const familyId = req.user?.familyId;
  if (!familyId) {
    return res.status(403).json({ ok: false, code: 'ADULT_PRIVILEGE_DISABLED' });
  }
  const enabled = await isAdultPrivilegeEnabled(familyId);
  if (!enabled) {
    return res.status(403).json({ ok: false, code: 'ADULT_PRIVILEGE_DISABLED' });
  }
  next();
}

// GET /api/family/adult-privilege/status
router.get('/adult-privilege/status', requireAuth, requireAdultPrivilegeFlag, async (req, res) => {
  try {
    if (req.user.type === 'parent') {
      const expiresAt = decodeAccessExpiry(req);
      return res.json({
        ok: true,
        state: 'active',
        privilegeActive: true,
        handoffAvailable: false,
        pinRequiredForUnlock: false,
        expiresAt,
      });
    }

    const evalResult = await evaluateHandoffForRequest(req, res);
    const handoffAvailable = evalResult.ok === true;
    let pinRequiredForUnlock = false;
    if (handoffAvailable) {
      pinRequiredForUnlock = await parentPinDb.familyAnyParentHasPin(evalResult.familyId);
    }

    let state = 'locked';
    if (!handoffAvailable) {
      const code = handoffEvalToClientCode(evalResult);
      if (code === 'PARENT_HANDOFF_EXPIRED') state = 'expired';
      else if (code === 'PARENT_HANDOFF_INVALID' && evalResult.code) state = 'revoked';
    }

    res.json({
      ok: true,
      state,
      privilegeActive: false,
      handoffAvailable,
      pinRequiredForUnlock,
      handoffCode: handoffAvailable ? null : handoffEvalToClientCode(evalResult),
    });
  } catch (err) {
    console.error('[ADULT_PRIVILEGE] status error:', req.id, err.message);
    res.status(500).json({ ok: false, code: 'SERVER_ERROR' });
  }
});

// POST /api/family/adult-privilege/unlock
router.post('/adult-privilege/unlock', requireAuth, requireAdultPrivilegeFlag, parentPinLimiter, async (req, res) => {
  try {
    if (req.user.type === 'parent') {
      const expiresAt = decodeAccessExpiry(req);
      return res.json({
        ok: true,
        alreadyParent: true,
        state: 'active',
        parent: {
          id: req.user.id,
          email: req.user.email || null,
          familyId: req.user.familyId,
          isAdmin: req.user.isAdmin || false,
          type: 'parent',
          onboarding_completed: req.user.onboarding_completed,
        },
        expiresAt,
      });
    }

    if (req.user.type !== 'child') {
      return res.status(403).json({ ok: false, code: 'ADULT_PRIVILEGE_CHILD_ONLY' });
    }

    const unlockMethod = String(req.body?.unlockMethod || 'biometric');
    if (unlockMethod === 'pin') {
      return res.status(501).json({
        ok: false,
        code: 'ADULT_PRIVILEGE_PIN_NEXT_PHASE',
        message: 'Use ParentalGate PIN flow until Fas 3B',
      });
    }
    if (unlockMethod !== 'biometric') {
      return res.status(400).json({ ok: false, code: 'ADULT_PRIVILEGE_INVALID_METHOD' });
    }

    const evalResult = await evaluateHandoffForRequest(req, res);
    if (!evalResult.ok) {
      const code = handoffEvalToClientCode(evalResult);
      const status = code === 'PARENT_HANDOFF_EXPIRED' || code === 'PARENT_HANDOFF_USED' ? 409 : 401;
      return res.status(status).json({ ok: false, code, state: 'locked' });
    }

    const activation = await activateParentSessionCookies(req, res);
    if (!activation.ok) {
      const status = activation.code === 'PARENT_HANDOFF_USED' ? 409 : 401;
      return res.status(status).json({
        ok: false,
        code: activation.code,
        state: activation.code === 'PARENT_HANDOFF_EXPIRED' ? 'expired' : 'revoked',
      });
    }

    const csrfToken = generateCsrfToken(res);
    const expiresAt = activation.expiresAt || decodeAccessExpiry(req);

    res.json({
      ok: true,
      state: 'active',
      csrfToken,
      parent: toParentSessionUser(activation.parent),
      expiresAt,
      verified: true,
    });
  } catch (err) {
    console.error('[ADULT_PRIVILEGE] unlock error:', req.id, err.message);
    res.status(500).json({ ok: false, code: 'SERVER_ERROR' });
  }
});

module.exports = router;
