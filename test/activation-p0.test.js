'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  isWithinP0Window,
  reconcileP0State,
  getActivationFunnelStep,
  isP0Activated,
  P0_WINDOW_MS,
} = require('../src/lib/activation-p0-core');

const { selectStarterTemplate, enforceActivityCount, scorePackage } = require('../src/lib/starter-plan/select-template');
const { STARTER_PLAN_PACKAGES } = require('../config/starter-plan-meta');

describe('activation-p0-core', () => {
  const signupAt = new Date('2026-06-01T10:00:00.000Z');

  it('48h window accepts events within 48 hours', () => {
    const within = new Date(signupAt.getTime() + P0_WINDOW_MS - 1000);
    assert.equal(isWithinP0Window(signupAt, within), true);
  });

  it('48h window rejects events after 48 hours', () => {
    const after = new Date(signupAt.getTime() + P0_WINDOW_MS + 1);
    assert.equal(isWithinP0Window(signupAt, after), false);
  });

  it('reconcileP0State requires all three milestones within 48h', () => {
    const state = {
      signup_at: signupAt,
      schema_saved_at: new Date('2026-06-01T11:00:00.000Z'),
      child_access_completed_at: new Date('2026-06-01T12:00:00.000Z'),
      first_completion_at: new Date('2026-06-01T13:00:00.000Z'),
    };
    const result = reconcileP0State(state);
    assert.ok(result.p0ActivatedAt);
    assert.equal(result.p0ActivatedWithin48h, true);
  });

  it('reconcileP0State fails when one milestone is outside 48h', () => {
    const state = {
      signup_at: signupAt,
      schema_saved_at: new Date('2026-06-01T11:00:00.000Z'),
      child_access_completed_at: new Date('2026-06-01T12:00:00.000Z'),
      first_completion_at: new Date(signupAt.getTime() + P0_WINDOW_MS + 60_000),
    };
    const result = reconcileP0State(state);
    assert.equal(result.p0ActivatedAt, null);
    assert.equal(result.p0ActivatedWithin48h, false);
  });

  it('getActivationFunnelStep uses child_access not profile_created', () => {
    const afterChildOnly = {
      signup_at: signupAt,
      schema_saved_at: new Date('2026-06-01T11:00:00.000Z'),
      child_access_completed_at: new Date('2026-06-01T12:00:00.000Z'),
      first_completion_at: null,
      p0_activated_at: null,
      p0_activated_within_48h: false,
    };
    assert.equal(getActivationFunnelStep(afterChildOnly), 'child_access');

    const schemaOnly = { ...afterChildOnly, child_access_completed_at: null };
    assert.equal(getActivationFunnelStep(schemaOnly), 'schema_saved');

    const childOnly = {
      signup_at: signupAt,
      child_created_at: new Date('2026-06-01T10:30:00.000Z'),
      schema_saved_at: null,
      child_access_completed_at: null,
      first_completion_at: null,
      p0_activated_at: null,
      p0_activated_within_48h: false,
    };
    assert.equal(getActivationFunnelStep(childOnly), 'child_created');
  });

  it('isP0Activated reads p0_activated_at', () => {
    assert.equal(isP0Activated({ p0_activated_at: new Date() }), true);
    assert.equal(isP0Activated({ p0_activated_at: null }), false);
  });
});

describe('starter-plan select-template', () => {
  it('selects morning package for morning routine', () => {
    const result = selectStarterTemplate({
      ageBand: '6-8',
      routineType: 'morning',
      supportLevel: 'medium',
      desiredLength: 'short',
    });
    assert.equal(result.scheduleName, 'Kort morgon');
    assert.equal(result.maxActivities, 5);
  });

  it('selects preschool for young age band', () => {
    const result = selectStarterTemplate({
      ageBand: '3-5',
      routineType: 'after_school',
      supportLevel: 'low',
      desiredLength: 'normal',
    });
    assert.equal(result.scheduleName, 'Förskola vardag');
  });

  it('enforceActivityCount respects max for desired length', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ name: `A${i}` }));
    assert.equal(enforceActivityCount(items, 'short').length, 5);
    assert.equal(enforceActivityCount(items, 'detailed').length, 7);
  });

  it('every package has a matching scheduleName', () => {
    const names = new Set(STARTER_PLAN_PACKAGES.map((p) => p.scheduleName));
    assert.ok(names.has('Kort morgon'));
    assert.ok(names.has('Kvällsrutin'));
    assert.equal(scorePackage(STARTER_PLAN_PACKAGES[0], {
      ageBand: '3-5',
      routineType: 'morning',
      supportLevel: 'medium',
      desiredLength: 'short',
    }), 17);
  });
});
