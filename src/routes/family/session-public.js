'use strict';

/**
 * Family session routes mounted BEFORE requireParent.
 * Handoff-based picker PIN + child-session parent activation.
 */
const express = require('express');
const db = require('../../lib/db');
const { requireAuth } = require('../../middleware/auth');
const { generateCsrfToken } = require('../../middleware/csrf');
const { parentPinLimiter } = require('../../middleware/rateLimiter');
const parentPinDb = require('../../../db/parent-pin');
const { activateParentSessionCookies } = require('../../lib/parent-session-cookies');
const {
  evaluateHandoffForRequest,
  mapHandoffClientCode,
  HANDOFF_CODES,
} = require('../../lib/parent-session-handoff');

const router = express.Router();

function handoffEvalToClientCode(evalResult) {
  if (evalResult.ok) return null;
  if (evalResult.code === HANDOFF_CODES.used) return 'PARENT_HANDOFF_USED';
  if (evalResult.code === HANDOFF_CODES.expired) return 'PARENT_HANDOFF_EXPIRED';
  if (evalResult.code === HANDOFF_CODES.revoked || evalResult.code === HANDOFF_CODES.row_missing) {
    return 'PARENT_HANDOFF_INVALID';
  }
  return mapHandoffClientCode(evalResult.reason || 'missing');
}

async function fetchParentRow(parentId) {
  const parentResult = await db.query(
    `SELECT id, email, family_id, is_admin, onboarding_completed
     FROM parent WHERE id = $1`,
    [parentId]
  );
  return parentResult.rows[0] || null;
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

/** Handoff-only context — no parent/child JWT required (post child-logout PIN path). */
async function attachHandoffPickerContext(req, res, next) {
  try {
    const evalResult = await evaluateHandoffForRequest(req, res);
    if (!evalResult.ok) {
      const code = handoffEvalToClientCode(evalResult);
      const status = code === 'PARENT_HANDOFF_EXPIRED' || code === 'PARENT_HANDOFF_USED' ? 409 : 401;
      return res.status(status).json({ ok: false, code });
    }
    const parentRow = await fetchParentRow(evalResult.parentId);
    if (!parentRow) {
      return res.status(401).json({ ok: false, code: 'PARENT_HANDOFF_INVALID' });
    }
    req.handoffPicker = evalResult;
    req.user = {
      id: evalResult.parentId,
      familyId: evalResult.familyId,
      type: 'parent',
    };
    next();
  } catch (err) {
    console.error('[FAMILY] attachHandoffPickerContext error:', req.id, err.message);
    res.status(500).json({ ok: false, code: 'SERVER_ERROR' });
  }
}

// GET /api/family/parent-pin-status-picker — handoff cookie only (no JWT).
router.get('/parent-pin-status-picker', async (req, res) => {
  try {
    const evalResult = await evaluateHandoffForRequest(req, res);
    if (!evalResult.ok) {
      return res.json({ has_session: false, has_pin: false });
    }
    const hasPin = await parentPinDb.parentHasPin(evalResult.parentId);
    res.json({
      has_session: true,
      has_pin: hasPin,
    });
  } catch (err) {
    console.error('[FAMILY] parent-pin-status-picker error:', req.id, err.message);
    res.status(500).json({ ok: false, code: 'SERVER_ERROR' });
  }
});

// POST /api/family/verify-pin-picker — CSRF-exempt; handoff + PIN only (see csrf.js).
router.post(
  '/verify-pin-picker',
  attachHandoffPickerContext,
  parentPinLimiter,
  async (req, res) => {
    try {
      const { pin } = req.body;
      if (!pin || !/^\d{4}$/.test(String(pin))) {
        return res.status(400).json({ ok: false, code: 'PARENT_PIN_INVALID' });
      }

      if (!(await parentPinDb.parentHasPin(req.user.id))) {
        return res.status(400).json({ ok: false, code: 'PARENT_PIN_REQUIRED' });
      }

      const pinResult = await parentPinDb.verifyParentPin({
        familyId: req.user.familyId,
        parentId: req.user.id,
        pin,
      });
      if (!pinResult.ok) {
        return res.status(401).json({ ok: false, code: 'PARENT_PIN_INVALID' });
      }

      const activation = await activateParentSessionCookies(req, res);
      if (!activation.ok) {
        const status = activation.code === 'PARENT_HANDOFF_USED' ? 409 : 401;
        return res.status(status).json({ ok: false, code: activation.code });
      }

      const csrfToken = generateCsrfToken(res);
      res.json({
        ok: true,
        csrfToken,
        parent: toParentSessionUser(activation.parent),
        expiresAt: activation.expiresAt,
      });
    } catch (err) {
      console.error('[FAMILY] verify-pin-picker error:', req.id, err.message);
      res.status(500).json({ ok: false, code: 'SERVER_ERROR' });
    }
  }
);

// POST /api/family/activate-saved-parent-session
// Child cookie + saved parent session, family has no parent PIN.
router.post('/activate-saved-parent-session', requireAuth, async (req, res) => {
  try {
    if (req.user.type === 'parent') {
      return res.json({ ok: true, alreadyParent: true, parent: toParentSessionUser({
        id: req.user.id,
        email: req.user.email,
        family_id: req.user.familyId,
        is_admin: req.user.isAdmin,
        onboarding_completed: req.user.onboarding_completed,
      }) });
    }

    const evalResult = await evaluateHandoffForRequest(req, res);
    if (!evalResult.ok) {
      return res.status(401).json({
        ok: false,
        code: handoffEvalToClientCode(evalResult) || 'PARENT_HANDOFF_INVALID',
      });
    }

    const hasPin = await parentPinDb.familyAnyParentHasPin(evalResult.familyId);
    if (hasPin) {
      return res.status(403).json({
        ok: false,
        code: 'PARENT_PIN_REQUIRED',
      });
    }

    const activation = await activateParentSessionCookies(req, res);
    if (!activation.ok) {
      return res.status(401).json({ ok: false, code: activation.code });
    }

    const csrfToken = generateCsrfToken(res);
    res.json({
      ok: true,
      csrfToken,
      parent: toParentSessionUser(activation.parent),
    });
  } catch (err) {
    console.error('[FAMILY] activate-saved-parent-session error:', req.id, err.message);
    res.status(500).json({ ok: false, code: 'SERVER_ERROR' });
  }
});

module.exports = router;
