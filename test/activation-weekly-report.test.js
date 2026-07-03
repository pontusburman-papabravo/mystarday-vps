'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  findBiggestFunnelDropoff,
  computeActivationRateLift,
} = require('../src/lib/activation-weekly-report');

const FUNNEL_STEPS = [
  { key: 'signup', label: 'Signup' },
  { key: 'child_created', label: 'Barn skapat' },
  { key: 'routine_ready', label: 'Rutin klar' },
  { key: 'child_access', label: 'Barnåtkomst' },
  { key: 'first_completion', label: 'Första stjärnan' },
];

const ROOT = path.join(__dirname, '..');

describe('activation weekly report (ACT-1 AI-only)', () => {
  it('db exports getActivationWeeklyReport', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/activation-funnel.js'), 'utf8');
    assert.match(src, /getActivationWeeklyReport/);
    assert.match(src, /getActivationP0WeeklyCohorts/);
  });

  it('admin route serves activation-weekly-report', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/admin/analytics.js'), 'utf8');
    assert.match(src, /\/analytics\/activation-weekly-report/);
  });

  it('admin analytics UI loads weekly report panel', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/admin/admin-analytics.js'), 'utf8');
    assert.match(src, /loadActivationWeeklyReport/);
    assert.match(src, /Veckorapport aktivering/);
    assert.doesNotMatch(src, /loadActivationExperiment\(\)/);
  });

  it('onboarding suggest sets template_plus_ai when AI flag path exists', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/onboarding.js'), 'utf8');
    assert.match(src, /template_plus_ai/);
    assert.match(src, /FLAG_KEYS\.aiStarterPlan/);
  });

  it('starter-plan enables add-child flow when onboarding flag on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/onboarding-starter-plan.js'), 'utf8');
    assert.match(src, /add_child_entry/);
    assert.doesNotMatch(src, /IS_ADD_CHILD\) return;\s*\n\s*try/);
  });
});

describe('findBiggestFunnelDropoff', () => {
  it('returns step with largest drop for latest cohort', () => {
    const funnel = {
      steps: FUNNEL_STEPS,
      cohorts: [{
        cohort_week: '2026-06-30',
        counts: { signup: 10, child_created: 10, routine_ready: 8, child_access: 6, first_completion: 3 },
        conversions: {
          signup_to_child_created: { from_count: 10, to_count: 10, rate_pct: 100 },
          child_created_to_routine_ready: { from_count: 10, to_count: 8, rate_pct: 80 },
          routine_ready_to_child_access: { from_count: 8, to_count: 6, rate_pct: 75 },
          child_access_to_first_completion: { from_count: 6, to_count: 3, rate_pct: 50 },
        },
      }],
    };
    const drop = findBiggestFunnelDropoff(funnel);
    assert.equal(drop.from_label, 'Barnåtkomst');
    assert.equal(drop.to_label, 'Första stjärnan');
    assert.equal(drop.drop_pct, 50);
  });
});

describe('computeActivationRateLift', () => {
  it('computes week-over-week delta', () => {
    const lift = computeActivationRateLift([
      { cohort_week: '2026-06-30', signups: 10, rate_48h: 30 },
      { cohort_week: '2026-06-23', signups: 12, rate_48h: 25 },
    ]);
    assert.equal(lift.delta_pp, 5);
    assert.match(lift.message, /\+5/);
  });

  it('handles insufficient data', () => {
    const lift = computeActivationRateLift([{ cohort_week: '2026-06-30', signups: 5, rate_48h: 20 }]);
    assert.equal(lift.delta_pp, null);
  });
});
