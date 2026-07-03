'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('First Success funnel admin UI (PR 3)', () => {
  it('uses First Success-tratt heading and 6-step description', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/admin/admin-analytics.js'), 'utf8');
    assert.match(src, /First Success-tratt/);
    assert.match(src, /signup → barn → schema → barnåtkomst → första stjärnan → aktivitet dag 2/);
    assert.doesNotMatch(src, /9 steg enligt ACT-1/);
    assert.doesNotMatch(src, /Aktiveringstratt \(P0\)/);
  });

  it('renders steps from API and shows step-to-step conversions', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/admin/admin-analytics.js'), 'utf8');
    assert.match(src, /buildFunnelConversionColumns/);
    assert.match(src, /activationFunnelConvHead/);
    assert.match(src, /activationFunnelConvBody/);
    assert.match(src, /row\.conversions/);
    assert.match(src, /conv\.rate_pct/);
    assert.match(src, /childAccessDiagnostics/);
  });

  it('activation tab uses weekly report instead of A/B experiment UI', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/admin/admin-analytics.js'), 'utf8');
    assert.match(src, /Veckorapport aktivering/);
    assert.match(src, /loadActivationWeeklyReport/);
    assert.match(src, /Värvningar \(referral v0\)/);
    assert.match(src, /loadReferralsAdmin/);
    assert.doesNotMatch(src, /Experiment — activation_rate_48h per variant/);
    assert.doesNotMatch(src, /loadActivationExperiment/);
  });
});
