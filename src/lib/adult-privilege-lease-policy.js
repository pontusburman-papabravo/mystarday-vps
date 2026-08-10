'use strict';

/**
 * Fas 3B — central adult privilege lease policy (server source of truth for durations).
 * device_mode drives whether escalation is temporary and how background is handled.
 */

const LEASE_DURATION_MS = {
  shared: 15 * 60 * 1000,
  child: 15 * 60 * 1000,
  parent: null,
};

/** Grace before background starts consuming lease clock (client uses same values). */
const BACKGROUND_GRACE_MS = {
  shared: 90 * 1000,
  child: 90 * 1000,
  parent: null,
};

const PARENT_DEVICE_BACKGROUND_GRACE_MS = 5 * 60 * 1000;

function normalizeDeviceMode(mode) {
  if (mode === 'shared' || mode === 'child' || mode === 'parent') return mode;
  return 'shared';
}

function leaseApplies(deviceMode) {
  const m = normalizeDeviceMode(deviceMode);
  return m === 'shared' || m === 'child';
}

function leaseDurationMs(deviceMode) {
  const m = normalizeDeviceMode(deviceMode);
  return LEASE_DURATION_MS[m];
}

function backgroundGraceMs(deviceMode) {
  const m = normalizeDeviceMode(deviceMode);
  if (m === 'parent') return PARENT_DEVICE_BACKGROUND_GRACE_MS;
  return BACKGROUND_GRACE_MS[m];
}

function buildPolicyPayload(deviceMode) {
  const mode = normalizeDeviceMode(deviceMode);
  return {
    deviceMode: mode,
    leaseApplies: leaseApplies(mode),
    leaseDurationMs: leaseDurationMs(mode),
    backgroundGraceMs: backgroundGraceMs(mode),
    parentDeviceNoAutoDrop: mode === 'parent',
  };
}

module.exports = {
  LEASE_DURATION_MS,
  BACKGROUND_GRACE_MS,
  PARENT_DEVICE_BACKGROUND_GRACE_MS,
  normalizeDeviceMode,
  leaseApplies,
  leaseDurationMs,
  backgroundGraceMs,
  buildPolicyPayload,
};
