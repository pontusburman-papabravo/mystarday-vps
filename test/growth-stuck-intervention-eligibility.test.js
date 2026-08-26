'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isInterventionGoalMet,
  isFamilyActivated,
  formatBlockerMessage,
} = require('../src/lib/growth-stuck-intervention');
const { INTERVENTION_KEYS } = require('../src/lib/growth-stuck-intervention-templates');

describe('growth-stuck-intervention eligibility — schema_without_child_access', () => {
  const schemaKey = INTERVENTION_KEYS.schema_without_child_access;

  it('P0 activated without child_access_completed_at is NOT goal met', () => {
    const row = {
      p0_activated_at: new Date().toISOString(),
      p0_activated_within_48h: true,
      child_access_completed_at: null,
      first_completion_at: null,
    };
    assert.equal(isFamilyActivated(row), true);
    assert.equal(isInterventionGoalMet(schemaKey, row), false);
  });

  it('child_access_completed_at blocks schema intervention (goal met)', () => {
    const row = {
      p0_activated_at: null,
      child_access_completed_at: new Date().toISOString(),
      first_completion_at: null,
    };
    assert.equal(isInterventionGoalMet(schemaKey, row), true);
  });

  it('no P0 and no child access is not goal met', () => {
    const row = {
      p0_activated_at: null,
      child_access_completed_at: null,
      first_completion_at: null,
    };
    assert.equal(isInterventionGoalMet(schemaKey, row), false);
  });

  it('other interventions still use broad family_activated signal', () => {
    const row = {
      p0_activated_at: new Date().toISOString(),
      child_access_completed_at: null,
      first_completion_at: null,
    };
    assert.equal(
      isInterventionGoalMet(INTERVENTION_KEYS.onboarding_incomplete, row),
      true
    );
  });

  it('formats intervention_goal_met blocker message', () => {
    assert.match(formatBlockerMessage('intervention_goal_met'), /Barnåtkomst/);
  });
});
