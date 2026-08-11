'use strict';

const LAUNCH_CONTEXTS = Object.freeze({
  COLD_START: 'cold_start',
  FOREGROUND_RESUME: 'foreground_resume',
  PROFILE_SWITCH: 'profile_switch',
});

const VALID_LAUNCH_CONTEXTS = new Set(Object.values(LAUNCH_CONTEXTS));

function normalizeLaunchContext(raw) {
  if (typeof raw !== 'string' || !raw) return LAUNCH_CONTEXTS.COLD_START;
  const value = raw.trim().toLowerCase();
  return VALID_LAUNCH_CONTEXTS.has(value) ? value : LAUNCH_CONTEXTS.COLD_START;
}

function isMultiProfileShared(allowedChildCount, allowedParentCount) {
  return (allowedChildCount + allowedParentCount) > 1;
}

function shouldForceSharedProfilePicker(launchContext, allowedChildCount, allowedParentCount) {
  if (!isMultiProfileShared(allowedChildCount, allowedParentCount)) return false;
  const ctx = normalizeLaunchContext(launchContext);
  return ctx === LAUNCH_CONTEXTS.COLD_START || ctx === LAUNCH_CONTEXTS.PROFILE_SWITCH;
}

function mayResumeChildSessionOnShared(launchContext, allowedChildCount, allowedParentCount) {
  if (!isMultiProfileShared(allowedChildCount, allowedParentCount)) return true;
  return normalizeLaunchContext(launchContext) === LAUNCH_CONTEXTS.FOREGROUND_RESUME;
}

module.exports = {
  LAUNCH_CONTEXTS,
  normalizeLaunchContext,
  isMultiProfileShared,
  shouldForceSharedProfilePicker,
  mayResumeChildSessionOnShared,
};
