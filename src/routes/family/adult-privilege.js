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
const { buildPolicyPayload } = require('../../lib/adult-privilege-lease-policy');
const {
  resolveDeviceModeForRequest,
  signParentAccessWithOptionalLease,
  isEscalatedParentExpired,
} = require('../../lib/adult-privilege-escalation');
const { setAccessCookie } = require('../../lib/refresh-tokens');
const {
  COOKIE_NAME: TRUSTED_DEVICE_COOKIE,
  restoreChildSessionFromDevice,
  verifyTrustedDeviceRaw,
} = require('../../lib/trusted-device');
const { verifyToken } = require('../../middleware/auth');

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

async function applyEscalationCookies(req, res, parentRow, escalationFromChildId) {
  const deviceMode = await resolveDeviceModeForRequest(req);
  const signed = signParentAccessWithOptionalLease(parentRow, {
    deviceMode,
    escalationFromChildId,
  });
  setAccessCookie(res, signed.accessToken, signed.expiresInSecs);
  return {
    deviceMode,
    privilegeLeaseUntil: signed.privilegeLeaseUntil,
    expiresAt: signed.privilegeLeaseUntil || Date.now() + signed.expiresInSecs * 1000,
    policy: buildPolicyPayload(deviceMode),
  };
}

async function unlockWithHandoff(req, res, options = {}) {
  const evalResult = await evaluateHandoffForRequest(req, res);
  if (!evalResult.ok) {
    const code = handoffEvalToClientCode(evalResult);
    const status = code === 'PARENT_HANDOFF_EXPIRED' || code === 'PARENT_HANDOFF_USED' ? 409 : 401;
    return { ok: false, status, code };
  }

  if (options.verifyPin) {
    const pin = String(options.pin || '');
    if (!/^\d{4}$/.test(pin)) {
      return { ok: false, status: 400, code: 'PARENT_PIN_INVALID' };
    }
    const pinResult = await parentPinDb.verifyParentPin({
      familyId: evalResult.familyId,
      pin,
    });
    if (!pinResult.ok) {
      return { ok: false, status: 401, code: 'PARENT_PIN_INVALID' };
    }
  }

  const activation = await activateParentSessionCookies(req, res);
  if (!activation.ok) {
    const status = activation.code === 'PARENT_HANDOFF_USED' ? 409 : 401;
    return {
      ok: false,
      status,
      code: activation.code,
      state: activation.code === 'PARENT_HANDOFF_EXPIRED' ? 'expired' : 'revoked',
    };
  }

  const escalationFromChildId = req.user?.type === 'child' ? req.user.id : null;
  const leaseMeta = await applyEscalationCookies(req, res, activation.parent, escalationFromChildId);
  const csrfToken = generateCsrfToken(res);

  return {
    ok: true,
    csrfToken,
    parent: toParentSessionUser(activation.parent),
    expiresAt: leaseMeta.expiresAt,
    privilegeLeaseUntil: leaseMeta.privilegeLeaseUntil,
    policy: leaseMeta.policy,
    verified: true,
  };
}

function readParentLeaseFromRequest(req) {
  try {
    const token = req.cookies?.access_token;
    if (!token) return null;
    const decoded = verifyToken(token);
    if (decoded.type !== 'parent') return null;
    return decoded;
  } catch {
    return null;
  }
}

function decodeAccessExpiry(req) {
  const decoded = readParentLeaseFromRequest(req);
  if (decoded?.privilegeLeaseUntil) return Number(decoded.privilegeLeaseUntil);
  const token = req.cookies?.access_token;
  if (!token) return null;
  try {
    const payload = jwt.decode(token);
    if (!payload || !payload.exp) return null;
    return payload.exp * 1000;
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
      const decoded = readParentLeaseFromRequest(req);
      const deviceMode = await resolveDeviceModeForRequest(req);
      const policy = buildPolicyPayload(deviceMode);
      const leaseExpired = decoded && isEscalatedParentExpired(decoded);
      const privilegeActive = !leaseExpired;
      const expiresAt = decodeAccessExpiry(req);
      return res.json({
        ok: true,
        state: privilegeActive ? 'active' : 'expired',
        privilegeActive,
        dormantParentCredential: false,
        handoffAvailable: false,
        pinRequiredForUnlock: false,
        expiresAt,
        privilegeLeaseUntil: decoded?.privilegeLeaseUntil || null,
        policy,
      });
    }

    const deviceMode = await resolveDeviceModeForRequest(req);
    const policy = buildPolicyPayload(deviceMode);

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
      dormantParentCredential: handoffAvailable,
      handoffAvailable,
      pinRequiredForUnlock,
      handoffCode: handoffAvailable ? null : handoffEvalToClientCode(evalResult),
      policy,
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
    if (unlockMethod !== 'biometric' && unlockMethod !== 'pin') {
      return res.status(400).json({ ok: false, code: 'ADULT_PRIVILEGE_INVALID_METHOD' });
    }

    const result = await unlockWithHandoff(req, res, {
      verifyPin: unlockMethod === 'pin',
      pin: req.body?.pin,
    });
    if (!result.ok) {
      return res.status(result.status || 401).json({
        ok: false,
        code: result.code,
        state: result.state || 'locked',
      });
    }

    res.json({
      ok: true,
      state: 'active',
      csrfToken: result.csrfToken,
      parent: result.parent,
      expiresAt: result.expiresAt,
      privilegeLeaseUntil: result.privilegeLeaseUntil,
      policy: result.policy,
      verified: true,
    });
  } catch (err) {
    console.error('[ADULT_PRIVILEGE] unlock error:', req.id, err.message);
    res.status(500).json({ ok: false, code: 'SERVER_ERROR' });
  }
});

// POST /api/family/adult-privilege/expire — drop leased parent privilege; restore child on shared/child device.
router.post('/adult-privilege/expire', requireAuth, requireAdultPrivilegeFlag, async (req, res) => {
  try {
    const deviceMode = await resolveDeviceModeForRequest(req);
    const policy = buildPolicyPayload(deviceMode);

    if (req.user.type !== 'parent') {
      return res.status(403).json({ ok: false, code: 'ADULT_PRIVILEGE_PARENT_ONLY' });
    }

    if (deviceMode === 'parent' && !req.user.privilegeEscalation) {
      return res.json({
        ok: true,
        noop: true,
        state: 'active',
        policy,
        reason: 'parent_device_no_lease',
      });
    }

    const rawToken = req.cookies?.[TRUSTED_DEVICE_COOKIE];
    if (rawToken) {
      const row = await verifyTrustedDeviceRaw(rawToken);
      if (!row) {
        return res.status(403).json({ ok: false, code: 'TRUSTED_DEVICE_INVALID' });
      }
    }

    if (!rawToken) {
      res.clearCookie('access_token', { path: '/' });
      res.clearCookie('refresh_token', { path: '/' });
      return res.json({
        ok: true,
        state: 'locked',
        requiresReauth: true,
        policy,
      });
    }

    const preferredChildId = req.user.escalationFromChildId || null;
    const restored = await restoreChildSessionFromDevice(req, res, rawToken, {
      preferredChildId,
      forcePicker: deviceMode === 'shared' && !preferredChildId,
    });
    if (!restored.ok) {
      return res.status(403).json({ ok: false, code: restored.code || 'CHILD_RESTORE_FAILED', policy });
    }

    const csrfToken = generateCsrfToken(res);
    res.json({
      ok: true,
      state: 'locked',
      privilegeActive: false,
      child: restored.child,
      device_mode: restored.device_mode,
      csrfToken,
      policy,
    });
  } catch (err) {
    console.error('[ADULT_PRIVILEGE] expire error:', req.id, err.message);
    res.status(500).json({ ok: false, code: 'SERVER_ERROR' });
  }
});

// GET /api/family/adult-privilege/policy
router.get('/adult-privilege/policy', requireAuth, requireAdultPrivilegeFlag, async (req, res) => {
  try {
    const deviceMode = await resolveDeviceModeForRequest(req);
    res.json({ ok: true, policy: buildPolicyPayload(deviceMode) });
  } catch (err) {
    res.status(500).json({ ok: false, code: 'SERVER_ERROR' });
  }
});

module.exports = router;
