'use strict';

const trusted = require('./trusted-device');
const deviceDb = require('../../db/family-trusted-device');
const authz = require('../middleware/authz');
const { getChildrenForParent } = require('../../db/parent-access');
const { isTrustedDeviceEnabled } = require('./trusted-device-flags');
const { isFamilyDeviceEntryEnabled } = require('./family-device-entry-flags');
const { isFamilyDeviceDailyUxEnabled } = require('./family-device-daily-ux-flags');
const { avatarApiFields } = require('./avatar-api');

const USAGE_PARENT = 'parent_phone';
const USAGE_SHARED = 'shared_with_children';
const USAGE_CHILD = 'child_device';

const START_PARENT = 'parent';
const START_PICKER = 'choose_child';

function usageFromDeviceMode(mode) {
  if (mode === 'parent') return USAGE_PARENT;
  if (mode === 'child') return USAGE_CHILD;
  return USAGE_SHARED;
}

function startModeFromRow(row) {
  if (row.device_mode === 'parent') return { kind: START_PARENT, child_id: null };
  if (row.device_mode === 'child') {
    return { kind: 'child', child_id: row.default_child_id };
  }
  if (!row.default_child_id) {
    return { kind: START_PICKER, child_id: null };
  }
  return { kind: 'child', child_id: row.default_child_id };
}

async function listAllowedChildrenForParent(parentId) {
  const rows = await getChildrenForParent(parentId, { allowedRoles: ['primary', 'shared'] });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji || '⭐',
    username: c.username,
    ...avatarApiFields(c, 'child'),
  }));
}

async function assertChildInParentScope(parentId, childId) {
  if (!childId) return false;
  const access = await authz.getChildAccess(parentId, childId);
  return Boolean(access);
}

async function resolveThisDeviceRow(rawToken, familyId) {
  if (!rawToken) return null;
  const row = await trusted.verifyTrustedDeviceRaw(rawToken);
  if (!row || row.family_id !== familyId) return null;
  return row;
}

function defaultDeviceLabel(platform) {
  if (platform === 'ios') return 'Den här iPhone';
  if (platform === 'android') return 'Den här mobilen';
  return 'Den här enheten';
}

async function buildThisDevicePayload({ row, parentId, allowedChildren }) {
  const start = startModeFromRow(row);
  let startChild = null;
  if (start.child_id) {
    startChild = allowedChildren.find((c) => c.id === start.child_id) || null;
  }
  const childrenOnDevice = row.device_mode === 'child' && row.default_child_id
    ? allowedChildren.filter((c) => c.id === row.default_child_id)
    : allowedChildren;

  return {
    enrolled: true,
    setup_required: false,
    device: {
      id: row.id,
      label: row.label || defaultDeviceLabel(row.platform),
      platform: row.platform || 'web',
      usage: usageFromDeviceMode(row.device_mode),
      start_mode: start.kind,
      start_child_id: start.child_id,
      start_child: startChild,
      children_on_device: childrenOnDevice,
      trusted_at: row.trusted_at,
      last_seen_at: row.last_seen_at,
    },
    allowed_children: allowedChildren,
    can_configure_children: allowedChildren.length > 0,
  };
}

/**
 * Diagnostics-only (P1): capture family id + the three effective Family Device
 * flags for THIS request, independent of whichever one gates `enabled` below, so
 * a "Barnenhet är inte aktiverat" report can be correlated without guessing.
 * No PIN/token/cookie values are logged. Never throws — a diagnostic failure must
 * never affect the real response.
 */
async function logThisDeviceDiag(familyId, extra) {
  let entryEnabled = null;
  let dailyUxEnabled = null;
  let resolverError = null;
  try {
    entryEnabled = await isFamilyDeviceEntryEnabled(familyId);
  } catch (err) {
    resolverError = 'family_device_entry_v1: ' + (err && err.message);
  }
  try {
    dailyUxEnabled = await isFamilyDeviceDailyUxEnabled(familyId);
  } catch (err) {
    resolverError = (resolverError ? resolverError + '; ' : '') + 'family_device_daily_ux_v1: ' + (err && err.message);
  }
  try {
    console.log('[THIS-DEVICE-DIAG]', JSON.stringify(Object.assign({
      family_id: familyId || null,
      family_id_type: typeof familyId,
      effective_family_device_entry_v1: entryEnabled,
      effective_family_device_daily_ux_v1: dailyUxEnabled,
      resolver_error: resolverError,
      ts: Date.now(),
    }, extra || {})));
  } catch (_) { /* diagnostics must never throw */ }
}

async function getThisDeviceState(req) {
  const familyId = req.user.familyId;
  const parentId = req.user.id;
  const enabled = await isTrustedDeviceEnabled(familyId);
  const allowedChildren = enabled ? await listAllowedChildrenForParent(parentId) : [];

  await logThisDeviceDiag(familyId, {
    effective_trusted_device_v1: enabled,
    trusted_device_lookup: 'not_checked_yet',
  });

  if (!enabled) {
    return {
      enabled: false,
      enrolled: false,
      setup_required: false,
      allowed_children: allowedChildren,
    };
  }

  const raw = req.cookies?.[trusted.COOKIE_NAME];
  const row = await resolveThisDeviceRow(raw, familyId);
  await logThisDeviceDiag(familyId, {
    effective_trusted_device_v1: enabled,
    trusted_device_lookup: !raw ? 'no_trusted_device_cookie' : (row ? 'row_found' : 'row_not_found_or_family_mismatch'),
  });
  if (!row) {
    return {
      enabled: true,
      enrolled: false,
      setup_required: true,
      allowed_children: allowedChildren,
      can_configure_children: allowedChildren.length > 0,
    };
  }

  const payload = await buildThisDevicePayload({ row, parentId, allowedChildren });
  return { enabled: true, ...payload };
}

function mapUsageToDeviceMode(usage) {
  if (usage === USAGE_PARENT) return 'parent';
  if (usage === USAGE_CHILD) return 'child';
  if (usage === USAGE_SHARED) return 'shared';
  return null;
}

async function applyThisDeviceUpdate({ row, familyId, parentId, body }) {
  const usage = body.usage;
  const startMode = body.start_mode;
  const startChildId = body.start_child_id || null;
  const label = typeof body.label === 'string' ? body.label.slice(0, 120) : undefined;

  const allowedChildren = await listAllowedChildrenForParent(parentId);
  const allowedIds = new Set(allowedChildren.map((c) => c.id));

  let deviceMode = row.device_mode;
  if (usage) {
    deviceMode = mapUsageToDeviceMode(usage);
    if (!deviceMode) {
      const err = new Error('INVALID_USAGE');
      err.code = 'INVALID_USAGE';
      throw err;
    }
  }

  let defaultChildId = row.default_child_id;
  if (deviceMode === 'parent') {
    defaultChildId = null;
  } else if (deviceMode === 'child') {
    const bound = startChildId || defaultChildId;
    if (!bound || !allowedIds.has(bound)) {
      const err = new Error('CHILD_ACCESS_DENIED');
      err.code = 'CHILD_ACCESS_DENIED';
      throw err;
    }
    defaultChildId = bound;
  } else if (deviceMode === 'shared') {
    if (startMode === START_PICKER) {
      defaultChildId = null;
    } else if (startMode === START_PARENT) {
      const err = new Error('INVALID_START_MODE');
      err.code = 'INVALID_START_MODE';
      throw err;
    } else if (startChildId) {
      if (!allowedIds.has(startChildId)) {
        const err = new Error('CHILD_ACCESS_DENIED');
        err.code = 'CHILD_ACCESS_DENIED';
        throw err;
      }
      defaultChildId = startChildId;
    }
  }

  const patch = { device_mode: deviceMode, default_child_id: defaultChildId };
  if (label !== undefined) patch.label = label;

  const updated = await deviceDb.updateDeviceSettings(row.id, familyId, patch);
  if (!updated) {
    const err = new Error('DEVICE_NOT_FOUND');
    err.code = 'DEVICE_NOT_FOUND';
    throw err;
  }
  return buildThisDevicePayload({ row: updated, parentId, allowedChildren });
}

async function completeDeviceSetup({ req, res, body }) {
  const familyId = req.user.familyId;
  const parentId = req.user.id;
  const enabled = await isTrustedDeviceEnabled(familyId);
  if (!enabled) {
    const err = new Error('FEATURE_DISABLED');
    err.code = 'TRUSTED_DEVICE_DISABLED';
    throw err;
  }

  const existing = await resolveThisDeviceRow(req.cookies?.[trusted.COOKIE_NAME], familyId);
  if (existing) {
    return applyThisDeviceUpdate({ row: existing, familyId, parentId, body });
  }

  const usage = body.usage;
  const platform = typeof body.platform === 'string' ? body.platform.slice(0, 32) : 'web';
  const label = typeof body.label === 'string' ? body.label.slice(0, 120) : defaultDeviceLabel(platform);
  const allowedChildren = await listAllowedChildrenForParent(parentId);

  let enrollResult;
  if (usage === USAGE_PARENT) {
    enrollResult = await trusted.enrollParentDevice({ parentId, familyId, platform, label });
  } else if (usage === USAGE_SHARED) {
    enrollResult = await trusted.enrollSharedDevice({ parentId, familyId, platform, label });
  } else if (usage === USAGE_CHILD) {
    const childId = body.start_child_id;
    if (!childId || !(await assertChildInParentScope(parentId, childId))) {
      const err = new Error('CHILD_ACCESS_DENIED');
      err.code = 'CHILD_ACCESS_DENIED';
      throw err;
    }
    enrollResult = await trusted.enrollChildDevice({ parentId, familyId, childId, platform, label });
  } else {
    const err = new Error('INVALID_USAGE');
    err.code = 'INVALID_USAGE';
    throw err;
  }

  trusted.setTrustedDeviceCookie(res, enrollResult.rawToken);
  const row = await deviceDb.findById(enrollResult.device.id);
  return applyThisDeviceUpdate({ row, familyId, parentId, body: { ...body, label } });
}

module.exports = {
  USAGE_PARENT,
  USAGE_SHARED,
  USAGE_CHILD,
  START_PARENT,
  START_PICKER,
  getThisDeviceState,
  applyThisDeviceUpdate,
  completeDeviceSetup,
  resolveThisDeviceRow,
  listAllowedChildrenForParent,
};
