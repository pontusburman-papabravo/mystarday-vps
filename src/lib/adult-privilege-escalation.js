'use strict';

const jwt = require('jsonwebtoken');
const config = require('./config');
const { parseDuration } = require('../routes/auth/session');
const {
  COOKIE_NAME,
  verifyTrustedDeviceRaw,
} = require('./trusted-device');
const {
  leaseApplies,
  leaseDurationMs,
  normalizeDeviceMode,
} = require('./adult-privilege-lease-policy');

async function resolveDeviceModeForRequest(req) {
  const raw = req.cookies?.[COOKIE_NAME];
  if (raw) {
    const row = await verifyTrustedDeviceRaw(raw);
    if (row?.device_mode) return normalizeDeviceMode(row.device_mode);
  }
  return 'shared';
}

function signParentAccessWithOptionalLease(parentRow, options = {}) {
  const deviceMode = normalizeDeviceMode(options.deviceMode || 'shared');
  const payload = {
    id: parentRow.id,
    type: 'parent',
    familyId: parentRow.family_id,
    email: parentRow.email || null,
    isAdmin: parentRow.is_admin || false,
  };

  let expiresIn = config.jwt.expiresIn;
  let privilegeLeaseUntil = null;

  if (leaseApplies(deviceMode)) {
    const leaseMs = leaseDurationMs(deviceMode);
    privilegeLeaseUntil = Date.now() + leaseMs;
    payload.privilegeEscalation = true;
    payload.privilegeLeaseUntil = privilegeLeaseUntil;
    if (options.escalationFromChildId) {
      payload.escalationFromChildId = options.escalationFromChildId;
    }
    expiresIn = Math.min(parseDuration(config.jwt.expiresIn), Math.ceil(leaseMs / 1000));
  }

  const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn });
  return { accessToken, privilegeLeaseUntil, expiresInSecs: expiresIn };
}

function isEscalatedParentExpired(decoded) {
  if (!decoded || decoded.type !== 'parent') return false;
  if (!decoded.privilegeEscalation) return false;
  if (!decoded.privilegeLeaseUntil) return false;
  return Date.now() > Number(decoded.privilegeLeaseUntil);
}

module.exports = {
  resolveDeviceModeForRequest,
  signParentAccessWithOptionalLease,
  isEscalatedParentExpired,
};
