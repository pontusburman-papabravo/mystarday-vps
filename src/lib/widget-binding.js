'use strict';

const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./db');
const trusted = require('./trusted-device');
const deviceDb = require('../../db/family-trusted-device');
const { getActiveChildAccess, getChildrenForParent } = require('../../db/parent-access');

const BINDING_TTL = '90d';

function issueBindingToken(payload) {
  return jwt.sign(
    {
      type: 'widget_binding',
      ...payload,
    },
    config.jwt.secret,
    { expiresIn: BINDING_TTL }
  );
}

function verifyBindingToken(raw) {
  if (!raw) return { ok: false, code: 'reauth_required' };
  try {
    const decoded = jwt.verify(raw, config.jwt.secret);
    if (decoded.type !== 'widget_binding') {
      return { ok: false, code: 'reauth_required' };
    }
    return { ok: true, binding: decoded };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { ok: false, code: 'reauth_required' };
    }
    return { ok: false, code: 'reauth_required' };
  }
}

async function resolveBindingFromTrustedDevice(rawDeviceToken, { childId, installationId, platform }) {
  const row = await trusted.verifyTrustedDeviceRaw(rawDeviceToken);
  if (!row) {
    return { ok: false, code: 'device_revoked' };
  }
  const enabled = await require('./trusted-device-flags').isTrustedDeviceEnabled(row.family_id);
  if (!enabled) {
    return { ok: false, code: 'device_revoked' };
  }

  let boundChildId = childId || row.default_child_id || row.last_active_child_id;
  if (!boundChildId && row.device_mode === 'shared') {
    return { ok: false, code: 'needs_child_selection' };
  }
  if (!boundChildId) {
    return { ok: false, code: 'needs_child_selection' };
  }

  const { getChildrenForParent } = require('../../db/parent-access');
  const allowed = await getChildrenForParent(row.created_by_parent_id, { allowedRoles: ['primary', 'shared'] });
  if (!allowed.some((c) => c.id === boundChildId)) {
    return { ok: false, code: 'device_revoked' };
  }

  const inst = String(installationId || '').trim();
  if (!inst || inst.length > 128) {
    return { ok: false, code: 'reauth_required', error: 'installation_id krävs' };
  }

  const token = issueBindingToken({
    mode: 'trusted_device',
    device_id: row.id,
    family_id: row.family_id,
    child_id: boundChildId,
    installation_id: inst,
    platform: platform === 'android' ? 'android' : 'ios',
  });

  return {
    ok: true,
    binding_token: token,
    child_id: boundChildId,
    family_id: row.family_id,
    platform: platform === 'android' ? 'android' : 'ios',
  };
}

async function resolveBindingFromParent(parentId, familyId, { childId, installationId, platform }) {
  const access = await getActiveChildAccess(parentId, childId);
  if (!access || access.family_id !== familyId) {
    return { ok: false, code: 'reauth_required' };
  }
  const inst = String(installationId || '').trim();
  if (!inst || inst.length > 128) {
    return { ok: false, code: 'reauth_required', error: 'installation_id krävs' };
  }
  const token = issueBindingToken({
    mode: 'parent',
    parent_id: parentId,
    family_id: familyId,
    child_id: childId,
    installation_id: inst,
    platform: platform === 'android' ? 'android' : 'ios',
  });
  return {
    ok: true,
    binding_token: token,
    child_id: childId,
    family_id: familyId,
    platform: platform === 'android' ? 'android' : 'ios',
  };
}

async function assertBindingStillValid(binding) {
  if (binding.mode === 'child_session') {
    const childRes = await db.query(
      'SELECT id, family_id FROM child WHERE id = $1',
      [binding.child_id]
    );
    const row = childRes.rows[0];
    if (!row || row.family_id !== binding.family_id) {
      return { ok: false, code: 'device_revoked' };
    }
    return { ok: true, familyId: binding.family_id, childId: binding.child_id };
  }
  if (binding.mode === 'trusted_device') {
    const row = await deviceDb.findById(binding.device_id);
    if (!row || row.revoked_at) {
      return { ok: false, code: 'device_revoked' };
    }
    const enabled = await require('./trusted-device-flags').isTrustedDeviceEnabled(row.family_id);
    if (!enabled) {
      return { ok: false, code: 'device_revoked' };
    }
    const allowed = await getChildrenForParent(row.created_by_parent_id, { allowedRoles: ['primary', 'shared'] });
    if (!allowed.some((c) => c.id === binding.child_id)) {
      return { ok: false, code: 'device_revoked' };
    }
    return { ok: true, familyId: row.family_id, childId: binding.child_id };
  }
  if (binding.mode === 'parent') {
    const access = await getActiveChildAccess(binding.parent_id, binding.child_id);
    if (!access) {
      return { ok: false, code: 'device_revoked' };
    }
    return { ok: true, familyId: binding.family_id, childId: binding.child_id };
  }
  return { ok: false, code: 'reauth_required' };
}

module.exports = {
  issueBindingToken,
  verifyBindingToken,
  resolveBindingFromTrustedDevice,
  resolveBindingFromParent,
  assertBindingStillValid,
};
