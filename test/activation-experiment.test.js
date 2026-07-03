'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('activation experiment (legacy PR5.2)', () => {
  it('db/activation-funnel still exports getActivationExperimentCohorts for history', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/activation-funnel.js'), 'utf8');
    assert.match(src, /getActivationExperimentCohorts/);
    assert.match(src, /template_plus_ai/);
    assert.match(src, /p0_activated_within_48h/);
  });

  it('admin route still serves activation-experiment for backward compat', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/admin/analytics.js'), 'utf8');
    assert.match(src, /\/analytics\/activation-experiment/);
    assert.match(src, /\/analytics\/activation-weekly-report/);
  });

  it('admin UI uses weekly report instead of A/B experiment table', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/admin/admin-analytics.js'), 'utf8');
    assert.match(src, /loadActivationWeeklyReport/);
    assert.doesNotMatch(src, /Experiment — activation_rate_48h per variant/);
  });
});
