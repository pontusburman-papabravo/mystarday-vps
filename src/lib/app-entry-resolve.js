'use strict';

/**
 * Fas 2A — pure entry decision engine (no navigation, storage, or network).
 * Device role ≠ view context ≠ credential context.
 */

const DESTINATIONS = Object.freeze({
  PARENT_HOME: 'parent-home',
  CHILD_HOME: 'child-home',
  PROFILE_PICKER: 'profile-picker',
  PARENT_LOGIN: 'parent-login',
  DEVICE_SETUP: 'device-setup',
});

const SERVER_ACTIONS = Object.freeze({
  NONE: 'none',
  RESTORE_PARENT: 'restore-parent',
  RESTORE_CHILD: 'restore-child',
  SELECT_CHILD: 'select-child',
  ENROLL_PROMPT: 'enroll-prompt',
});

function normalizeAllowedChildren(allowedChildren) {
  if (!Array.isArray(allowedChildren)) return [];
  const ids = [];
  for (let i = 0; i < allowedChildren.length; i++) {
    const id = allowedChildren[i] && allowedChildren[i].id;
    if (typeof id === 'string' && id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function isParentSessionAuthenticated(parentSession) {
  if (!parentSession) return false;
  if (parentSession.authenticated === true) return true;
  return parentSession.valid === true;
}

/** Active vuxenläge — not the same as latent parent/handoff on a child JWT. */
function isParentPrivilegeActive(state) {
  if (state && state.parentPrivilegeActive === true) return true;
  const ps = state && state.parentSession;
  if (!ps) return false;
  if (ps.privilegeActive === true) return true;
  if (ps.privileged === true) return true;
  return false;
}

function isChildSessionValid(childSession) {
  return Boolean(
    childSession &&
    childSession.valid === true &&
    typeof childSession.childId === 'string' &&
    childSession.childId
  );
}

function isTrustedDeviceActive(trustedDevice) {
  if (!trustedDevice || trustedDevice.valid !== true) return false;
  if (trustedDevice.revoked === true) return false;
  const mode = trustedDevice.deviceMode;
  return mode === 'parent' || mode === 'shared' || mode === 'child';
}

function buildResult(partial) {
  return {
    destination: partial.destination,
    deviceMode: partial.deviceMode ?? null,
    viewContext: partial.viewContext,
    credentialContext: partial.credentialContext,
    childId: partial.childId ?? null,
    reason: partial.reason,
    serverAction: partial.serverAction ?? SERVER_ACTIONS.NONE,
    failClosed: partial.failClosed === true,
  };
}

function failClosedPicker(deviceMode, reason) {
  return buildResult({
    destination: DESTINATIONS.PROFILE_PICKER,
    deviceMode,
    viewContext: 'picker',
    credentialContext: 'none',
    childId: null,
    reason,
    serverAction: SERVER_ACTIONS.SELECT_CHILD,
    failClosed: true,
  });
}

function childHomeDecision(deviceMode, childId, reason, serverAction) {
  return buildResult({
    destination: DESTINATIONS.CHILD_HOME,
    deviceMode,
    viewContext: 'child',
    credentialContext: 'child',
    childId,
    reason,
    serverAction: serverAction || SERVER_ACTIONS.RESTORE_CHILD,
  });
}

function parentHomeDecision(deviceMode, reason) {
  return buildResult({
    destination: DESTINATIONS.PARENT_HOME,
    deviceMode,
    viewContext: 'parent',
    credentialContext: 'parent',
    childId: null,
    reason,
    serverAction: SERVER_ACTIONS.NONE,
  });
}

function assertChildSessionCompatible(childSession, targetChildId, allowedIds) {
  if (!isChildSessionValid(childSession)) return { ok: true };
  if (!allowedIds.includes(childSession.childId)) {
    return { ok: false, reason: 'child_session_not_allowed' };
  }
  if (targetChildId && childSession.childId !== targetChildId) {
    return { ok: false, reason: 'child_session_mismatch' };
  }
  return { ok: true };
}

function resolveSharedChildTarget(trustedDevice, allowedIds) {
  if (allowedIds.length === 0) {
    return { kind: 'setup' };
  }
  if (allowedIds.length === 1) {
    return { kind: 'child', childId: allowedIds[0] };
  }
  const defaultId = trustedDevice.defaultChildId;
  if (defaultId && !allowedIds.includes(defaultId)) {
    return { kind: 'fail', reason: 'default_child_not_allowed' };
  }
  if (defaultId && allowedIds.includes(defaultId)) {
    return { kind: 'child', childId: defaultId };
  }
  return { kind: 'picker' };
}

function resolveChildModeTarget(trustedDevice, allowedIds) {
  const boundId = trustedDevice.defaultChildId;
  if (!boundId || !allowedIds.includes(boundId)) {
    return { kind: 'fail', reason: 'bound_child_not_allowed' };
  }
  return { kind: 'child', childId: boundId };
}

/**
 * @param {object} input
 * @param {object|null} input.parentSession — { authenticated?, privilegeActive?, valid?, privileged? }
 * @param {boolean} [input.parentPrivilegeActive] — explicit vuxenprivileg (wins over parentSession)
 * @param {object|null} input.childSession — { valid, childId }
 * @param {object|null} input.trustedDevice — { valid, revoked?, deviceMode, defaultChildId?, lastActiveChildId? }
 * @param {Array<{id:string}>} input.allowedChildren
 * @param {object|null} [input.deepLink] — { childId? }
 * @param {'parent'|'child'|null} [input.localDeviceModeHint] — ignored for authority (server wins)
 */
function resolveAppEntry(input) {
  const state = input || {};
  const allowedIds = normalizeAllowedChildren(state.allowedChildren);
  const trustedDevice = state.trustedDevice;
  const parentSession = state.parentSession;
  const childSession = state.childSession;
  const deepLink = state.deepLink;

  if (trustedDevice && trustedDevice.revoked === true) {
    return buildResult({
      destination: DESTINATIONS.PARENT_LOGIN,
      deviceMode: trustedDevice.deviceMode || null,
      viewContext: 'parent',
      credentialContext: 'none',
      reason: 'trusted_device_revoked',
      serverAction: SERVER_ACTIONS.ENROLL_PROMPT,
      failClosed: true,
    });
  }

  if (deepLink && typeof deepLink.childId === 'string' && deepLink.childId) {
    if (!allowedIds.includes(deepLink.childId)) {
      return failClosedPicker(
        isTrustedDeviceActive(trustedDevice) ? trustedDevice.deviceMode : null,
        'deep_link_child_out_of_scope'
      );
    }
  }

  const deepLinkChildId =
    deepLink && typeof deepLink.childId === 'string' && deepLink.childId ? deepLink.childId : null;

  if (!isTrustedDeviceActive(trustedDevice)) {
    if (isParentPrivilegeActive(state)) {
      return parentHomeDecision(null, 'legacy_parent_session_no_trusted_device');
    }
    if (isChildSessionValid(childSession)) {
      if (allowedIds.length && !allowedIds.includes(childSession.childId)) {
        return failClosedPicker(null, 'child_session_not_allowed');
      }
      return childHomeDecision(
        null,
        childSession.childId,
        'legacy_child_session_no_trusted_device',
        SERVER_ACTIONS.NONE
      );
    }
    return buildResult({
      destination: DESTINATIONS.PARENT_LOGIN,
      deviceMode: null,
      viewContext: 'parent',
      credentialContext: 'none',
      reason: 'no_family_or_device_auth',
      serverAction: SERVER_ACTIONS.ENROLL_PROMPT,
    });
  }

  const deviceMode = trustedDevice.deviceMode;

  if (deviceMode === 'parent') {
    if (isParentPrivilegeActive(state)) {
      return parentHomeDecision('parent', 'parent_device_parent_privilege');
    }
    if (!isChildSessionValid(childSession)) {
      return buildResult({
        destination: DESTINATIONS.PARENT_HOME,
        deviceMode: 'parent',
        viewContext: 'parent',
        credentialContext: 'none',
        reason: 'parent_device_restore_required',
        serverAction: SERVER_ACTIONS.RESTORE_PARENT,
      });
    }
  }

  if (deviceMode === 'shared' && isParentPrivilegeActive(state)) {
    return parentHomeDecision('shared', 'shared_device_parent_privilege_active');
  }

  let targetChildId = deepLinkChildId;

  if (!targetChildId && deviceMode === 'parent' && isChildSessionValid(childSession)) {
    targetChildId = childSession.childId;
  }

  if (!targetChildId) {
    if (deviceMode === 'child') {
      const bound = resolveChildModeTarget(trustedDevice, allowedIds);
      if (bound.kind === 'fail') {
        return failClosedPicker('child', bound.reason);
      }
      targetChildId = bound.childId;
    } else if (deviceMode === 'shared') {
      const shared = resolveSharedChildTarget(trustedDevice, allowedIds);
      if (shared.kind === 'fail') {
        return failClosedPicker('shared', shared.reason);
      }
      if (shared.kind === 'setup') {
        return buildResult({
          destination: DESTINATIONS.DEVICE_SETUP,
          deviceMode: 'shared',
          viewContext: 'picker',
          credentialContext: 'none',
          reason: 'shared_device_no_allowed_children',
          serverAction: SERVER_ACTIONS.ENROLL_PROMPT,
          failClosed: true,
        });
      }
      if (shared.kind === 'picker') {
        const sessionCheck = assertChildSessionCompatible(childSession, null, allowedIds);
        if (!sessionCheck.ok) {
          return failClosedPicker('shared', sessionCheck.reason);
        }
        return buildResult({
          destination: DESTINATIONS.PROFILE_PICKER,
          deviceMode: 'shared',
          viewContext: 'picker',
          credentialContext: 'none',
          reason: 'shared_device_picker_required',
          serverAction: SERVER_ACTIONS.SELECT_CHILD,
        });
      }
      targetChildId = shared.childId;
    }
  }

  const sessionCheck = assertChildSessionCompatible(childSession, targetChildId, allowedIds);
  if (!sessionCheck.ok) {
    return failClosedPicker(deviceMode, sessionCheck.reason);
  }

  if (!targetChildId || !allowedIds.includes(targetChildId)) {
    return failClosedPicker(deviceMode, 'target_child_not_allowed');
  }

  const needsRestore = !isChildSessionValid(childSession) || childSession.childId !== targetChildId;
  return childHomeDecision(
    deviceMode,
    targetChildId,
    deepLinkChildId ? 'deep_link_child_home' : 'trusted_device_child_home',
    needsRestore ? SERVER_ACTIONS.RESTORE_CHILD : SERVER_ACTIONS.NONE
  );
}

module.exports = {
  resolveAppEntry,
  DESTINATIONS,
  SERVER_ACTIONS,
  isParentPrivilegeActive,
  isParentSessionAuthenticated,
};
