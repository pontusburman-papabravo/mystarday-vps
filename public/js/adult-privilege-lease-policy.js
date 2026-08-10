/**
 * adult-privilege-lease-policy.js — client mirror of server lease policy (keep in sync).
 */
(function () {
  'use strict';

  const LEASE_DURATION_MS = { shared: 15 * 60 * 1000, child: 15 * 60 * 1000, parent: null };
  const BACKGROUND_GRACE_MS = { shared: 90 * 1000, child: 90 * 1000, parent: null };
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
    return LEASE_DURATION_MS[normalizeDeviceMode(deviceMode)];
  }

  function backgroundGraceMs(deviceMode) {
    const m = normalizeDeviceMode(deviceMode);
    if (m === 'parent') return PARENT_DEVICE_BACKGROUND_GRACE_MS;
    return BACKGROUND_GRACE_MS[m];
  }

  function shouldAutoExpireOnBackground(deviceMode) {
    return leaseApplies(deviceMode);
  }

  window.AdultPrivilegeLeasePolicy = {
    normalizeDeviceMode: normalizeDeviceMode,
    leaseApplies: leaseApplies,
    leaseDurationMs: leaseDurationMs,
    backgroundGraceMs: backgroundGraceMs,
    shouldAutoExpireOnBackground: shouldAutoExpireOnBackground,
    PARENT_DEVICE_BACKGROUND_GRACE_MS: PARENT_DEVICE_BACKGROUND_GRACE_MS,
  };
})();
