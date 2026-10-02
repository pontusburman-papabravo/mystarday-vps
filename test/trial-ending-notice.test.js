'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { shouldShowTrialEndingNotice } = require('../src/lib/trial-ending-notice');

function status(overrides) {
  return {
    access_kind: 'trial',
    trial_days_remaining: 1,
    premium: { active: true, source: 'trial', trial: true, expires_at: '2026-10-17T00:00:00+02:00' },
    ...overrides,
  };
}

describe('trial ending notice', () => {
  it('shows on the last day of a product trial', () => {
    assert.equal(shouldShowTrialEndingNotice(status()), true);
  });

  it('stays quiet with more than one day left and after the trial', () => {
    assert.equal(shouldShowTrialEndingNotice(status({ trial_days_remaining: 2 })), false);
    assert.equal(shouldShowTrialEndingNotice(status({ trial_days_remaining: 0, access_kind: 'limited', premium: { active: false, source: 'none', trial: false } })), false);
  });

  it('does not show for intro year or grandfather', () => {
    assert.equal(shouldShowTrialEndingNotice(status({
      access_kind: 'intro_year',
      trial_days_remaining: 1,
      premium: { active: true, source: 'intro_year', trial: false },
    })), false);
    assert.equal(shouldShowTrialEndingNotice(status({
      access_kind: 'grandfathered',
      trial_days_remaining: null,
      premium: { active: true, source: 'grandfathered', trial: false },
    })), false);
  });
});
