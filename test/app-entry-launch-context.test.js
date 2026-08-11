'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  LAUNCH_CONTEXTS,
  normalizeLaunchContext,
  shouldForceSharedProfilePicker,
  mayResumeChildSessionOnShared,
} = require('../src/lib/app-entry-launch-context');

describe('app-entry-launch-context', () => {
  it('normalizes launch context with cold_start default', () => {
    assert.equal(normalizeLaunchContext(undefined), LAUNCH_CONTEXTS.COLD_START);
    assert.equal(normalizeLaunchContext('foreground_resume'), LAUNCH_CONTEXTS.FOREGROUND_RESUME);
    assert.equal(normalizeLaunchContext('invalid'), LAUNCH_CONTEXTS.COLD_START);
  });

  it('forces picker on cold_start and profile_switch for multi-profile shared', () => {
    assert.equal(shouldForceSharedProfilePicker('cold_start', 2, 1), true);
    assert.equal(shouldForceSharedProfilePicker('profile_switch', 1, 1), true);
    assert.equal(shouldForceSharedProfilePicker('foreground_resume', 2, 1), false);
    assert.equal(shouldForceSharedProfilePicker('cold_start', 1, 0), false);
  });

  it('allows child resume only on foreground_resume when multi-profile', () => {
    assert.equal(mayResumeChildSessionOnShared('foreground_resume', 2, 1), true);
    assert.equal(mayResumeChildSessionOnShared('cold_start', 2, 1), false);
    assert.equal(mayResumeChildSessionOnShared('cold_start', 1, 0), true);
  });
});
