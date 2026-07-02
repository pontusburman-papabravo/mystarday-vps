'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('ACT-1 PR2 checkpoint', () => {
  it('onboarding-activation handles child handoff with flag gating', () => {
    const src = read('public/js/onboarding-activation.js');
    assert.match(src, /isHandoffEnabled/);
    assert.match(src, /confirmHandoffSkip/);
    assert.match(src, /notifyPinSet/);
    assert.match(src, /child-access-complete/);
    assert.match(src, /child_handoff_skipped/);
    assert.match(src, /child_view_opened/);
    assert.match(src, /activation_onboarding_started/);
    assert.doesNotMatch(src, /patchSkipInvite/);
    assert.doesNotMatch(src, /showFirstStarGuide/);
  });

  it('onboarding-first-star patches skipInvite and step6Btn', () => {
    const src = read('public/js/onboarding-first-star.js');
    assert.match(src, /patchSkipInvite/);
    assert.match(src, /patchStep6Btn/);
    assert.match(src, /firstStarDone/);
    assert.match(src, /activation_first_star_guide_v1/);
    assert.match(src, /first_star_guide/);
  });

  it('onboarding.js calls notifyPinSet after custom PIN save', () => {
    const src = read('public/js/onboarding.js');
    assert.match(src, /OnboardingActivation\.notifyPinSet/);
  });

  it('child-access-complete route updates activation state', () => {
    const src = read('src/routes/onboarding.js');
    assert.match(src, /child-access-complete/);
    assert.match(src, /updateActivationState\(req\.user\.familyId, 'child_access'/);
  });

  it('admin activation funnel API + UI (First Success 6-step funnel)', () => {
    const db = read('db/activation-funnel.js');
    const admin = read('src/routes/admin/analytics.js');
    const ui = read('public/admin/admin-analytics.js');
    assert.match(db, /second_day_activity/);
    assert.match(db, /child_created_at/);
    assert.match(db, /buildStepConversions/);
    assert.match(admin, /activation-funnel/);
    assert.match(ui, /loadActivationFunnel/);
    assert.match(ui, /First Success-tratt/);
    assert.match(ui, /buildFunnelConversionColumns/);
  });

  it('onboarding.html loads activation + first-star scripts after onboarding.js', () => {
    const html = read('public/onboarding.html');
    const oIdx = html.indexOf('onboarding.js');
    const aIdx = html.indexOf('onboarding-activation.js');
    const fIdx = html.indexOf('onboarding-first-star.js');
    assert.ok(oIdx >= 0 && aIdx > oIdx && fIdx > aIdx);
  });
});
