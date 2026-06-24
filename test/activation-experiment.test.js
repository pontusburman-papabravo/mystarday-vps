'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('activation experiment (PR5.2)', () => {
  it('db/activation-funnel exports getActivationExperimentCohorts', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/activation-funnel.js'), 'utf8');
    assert.match(src, /getActivationExperimentCohorts/);
    assert.match(src, /template_only/);
    assert.match(src, /template_plus_ai/);
    assert.match(src, /p0_activated_within_48h/);
  });

  it('admin route serves activation-experiment', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/admin/analytics.js'), 'utf8');
    assert.match(src, /\/analytics\/activation-experiment/);
  });

  it('admin analytics UI loads experiment table', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/admin/admin-analytics.js'), 'utf8');
    assert.match(src, /loadActivationExperiment/);
    assert.match(src, /activation-experiment/);
  });
});
