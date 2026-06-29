'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Onboarding handoff P0', () => {
  it('onboarding.js skips steps 2–4 after schema via finalizeSchemaAndGoHandoff', () => {
    const src = read('public/js/onboarding.js');
    assert.match(src, /finalizeSchemaAndGoHandoff/);
    assert.match(src, /view_type: 'day'/);
    assert.match(src, /goToStep\(5\)/);
    assert.doesNotMatch(src, /hideWeekendModal\(\);\s*goToStep\(2\)/);
  });

  it('onboarding-activation wires step5 CTA and does not inflate child_access on continue', () => {
    const src = read('public/js/onboarding-activation.js');
    assert.match(src, /step5ChildLoginBtn/);
    assert.match(src, /step5ContinueParentBtn/);
    assert.match(src, /startChildHandoff/);
    assert.match(src, /recordChildAccess\('child_view'\)/);
    assert.doesNotMatch(src, /recordChildAccess\('step5_continue'\)/);
    assert.doesNotMatch(src, /recordChildAccess\('pin_set'\)/);
    assert.doesNotMatch(src, /fsgDashboard/);
  });

  it('notifyPinSet tracks child_pin_created only (no child_access)', () => {
    const src = read('public/js/onboarding-activation.js');
    const fn = src.slice(src.indexOf('function notifyPinSet'), src.indexOf('function init'));
    assert.match(fn, /child_pin_created/);
    assert.doesNotMatch(fn, /recordChildAccess/);
  });

  it('child-access-complete rejects non-verified sources', () => {
    const src = read('src/routes/onboarding.js');
    assert.match(src, /VERIFIED_CHILD_ACCESS_SOURCES/);
    assert.match(src, /skipped: true/);
  });

  it('child-login sets child_session_started and child_access', () => {
    const src = read('src/routes/auth/child-login.js');
    assert.match(src, /child_session_started/);
    assert.match(src, /updateActivationState\(child\.family_id, 'child_access'/);
  });

  it('update-pin does not set child_access milestone', () => {
    const src = read('src/routes/onboarding.js');
    const pinBlock = src.slice(src.indexOf("router.post('/update-pin'"), src.indexOf("router.post('/child-access-complete'"));
    assert.doesNotMatch(pinBlock, /updateActivationState/);
    assert.doesNotMatch(pinBlock, /'child_access'/);
  });

  it('onboarding.html has deferred parent PIN and invite blocks', () => {
    const html = read('public/onboarding.html');
    assert.match(html, /step5ChildLoginBtn/);
    assert.match(html, /onboardingParentPinBlock" class="hidden/);
    assert.match(html, /onboardingInviteBlock" class="hidden/);
  });
});
