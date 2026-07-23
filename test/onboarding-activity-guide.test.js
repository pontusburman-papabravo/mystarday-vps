'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('onboarding activity guide — parent defaults', () => {
  it('onboarding.html has activity guide step with three localized options', () => {
    const html = read('public/onboarding.html');
    assert.match(html, /stepActivityGuide/);
    assert.match(html, /onboarding\.activityGuide\.options\.free_order\.title/);
    assert.match(html, /onboarding\.activityGuide\.options\.one_at_a_time\.title/);
    assert.match(html, /onboarding\.activityGuide\.options\.time_and_order\.title/);
    assert.match(html, /onboarding\.activityGuide\.lead/);
    assert.doesNotMatch(html, /NPF-läge/i);
  });

  it('onboarding-activity-guide.js maps three presets to child flags', () => {
    const src = read('public/js/onboarding-activity-guide.js');
    assert.match(src, /free_order/);
    assert.match(src, /one_at_a_time/);
    assert.match(src, /time_and_order/);
    assert.match(src, /require_sequential_completion: false/);
    assert.match(src, /show_now_next: true/);
    assert.match(src, /activity_timers_enabled: true/);
    assert.match(src, /\/api\/onboarding\/child-activity-guide/);
  });

  it('onboarding route persists preset flags on child row', () => {
    const src = read('src/routes/onboarding.js');
    assert.match(src, /child-activity-guide/);
    assert.match(src, /ACTIVITY_GUIDE_PRESETS/);
    assert.match(src, /require_sequential_completion/);
    assert.match(src, /show_now_next/);
    assert.match(src, /activity_timers_enabled/);
  });

  it('finalizeSchemaAndGoHandoff routes to activity guide before handoff', () => {
    const src = read('public/js/onboarding.js');
    assert.match(src, /OnboardingActivityGuide\.goToActivityGuideStep/);
  });

  it('activity timer still requires duration_seconds on activity', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /duration_seconds/);
    assert.match(src, /activityTimersEnabled/);
  });

  it('child-settings keeps separate toggles for parent edits later', () => {
    const src = read('public/js/child-settings.js');
    assert.match(src, /saveNnlMode/);
    assert.match(src, /toggle-activity_timers_enabled/);
  });

  it('onboarding activity guide does not touch barnets_samling gate', () => {
    const guide = read('public/js/onboarding-activity-guide.js');
    const route = read('src/routes/onboarding.js').slice(
      read('src/routes/onboarding.js').indexOf('child-activity-guide'),
      read('src/routes/onboarding.js').indexOf('child-activity-guide') + 1200
    );
    assert.doesNotMatch(guide, /barnets_samling/);
    assert.doesNotMatch(route, /barnets_samling/);
  });
});
