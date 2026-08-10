'use strict';

const crypto = require('crypto');
const trusted = require('./trusted-device');
const { isTrustedDeviceEnabled } = require('./trusted-device-flags');
const { evaluateHandoffForRequest } = require('./parent-session-handoff');
const deviceDb = require('../../db/family-trusted-device');

function hashTrustedRaw(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function mapAllowedChildren(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    username: c.username,
  }));
}

/**
 * Normalize request state for resolveAppEntry (no side effects except handoff eval may clear invalid cookies).
 */
async function buildAppEntryInput(req, res, options) {
  const opts = options || {};
  const user = req.user || null;

  const parentPrivilegeActive = user?.type === 'parent';
  let parentAuthenticated = parentPrivilegeActive;
  if (!parentAuthenticated) {
    const handoff = await evaluateHandoffForRequest(req, res);
    parentAuthenticated = handoff.ok === true;
  }

  const parentSession = {
    authenticated: parentAuthenticated,
    privilegeActive: parentPrivilegeActive,
  };

  const childSession =
    user?.type === 'child' && user.id
      ? { valid: true, childId: user.id }
      : { valid: false, childId: null };

  let trustedDevice = { valid: false };
  let allowedChildren = [];
  let familyId = user?.familyId || user?.family_id || null;

  const rawTrusted = req.cookies?.[trusted.COOKIE_NAME];
  if (rawTrusted) {
    const ctx = await trusted.getTrustedDeviceContext(rawTrusted);
    if (ctx.ok) {
      familyId = familyId || ctx.family_id;
      const enabled = await isTrustedDeviceEnabled(familyId);
      if (enabled) {
        const row = await trusted.verifyTrustedDeviceRaw(rawTrusted);
        trustedDevice = {
          valid: true,
          revoked: false,
          deviceMode: ctx.device_mode,
          defaultChildId: row?.default_child_id || null,
          lastActiveChildId: row?.last_active_child_id || null,
        };
        allowedChildren = mapAllowedChildren(ctx.allowed_children);
      }
    } else {
      const row = await deviceDb.findByTokenHash(hashTrustedRaw(rawTrusted));
      if (row?.revoked_at) {
        trustedDevice = {
          valid: false,
          revoked: true,
          deviceMode: row.device_mode,
        };
      }
    }
  }

  if (!allowedChildren.length && user?.type === 'parent' && user.id) {
    const { getChildrenForParent } = require('../../db/parent-access');
    const rows = await getChildrenForParent(user.id, { allowedRoles: ['primary', 'shared'] });
    allowedChildren = mapAllowedChildren(rows);
  }

  if (!allowedChildren.length && user?.type === 'child' && user.id) {
    allowedChildren = [{ id: user.id }];
  }

  let deepLink = null;
  const intentChildId = opts.intentChildId || req.query?.intent_child_id || req.query?.child_id;
  if (typeof intentChildId === 'string' && intentChildId) {
    deepLink = { childId: intentChildId };
  }

  return {
    parentSession,
    parentPrivilegeActive,
    childSession,
    trustedDevice,
    allowedChildren,
    deepLink,
    localDeviceModeHint: null,
    familyId,
  };
}

module.exports = {
  buildAppEntryInput,
};
