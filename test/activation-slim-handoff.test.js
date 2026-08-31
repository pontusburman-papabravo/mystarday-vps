'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { sanitizeReturnUrl } = require('../src/lib/sanitize-return-url');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

const PIN_URL_RE = /[?&]pin=/i;
const PIN_HREF_RE = /href\s*=\s*['"`][^'"`]*pin=/i;
const MAILTO_PIN_RE = /mailto:[^'"`\n]*pin/i;

describe('activation slim honest handoff (static)', () => {
  const starter = read('public/js/onboarding-starter-plan.js');
  const hub = read('public/js/dashboard-home-hub.js');
  const handoff = read('public/js/dashboard-child-handoff.js');
  const onboardingRoute = read('src/routes/onboarding.js');
  const svOnboarding = readJson('config/i18n/onboarding-sv-SE.json');
  const enOnboarding = readJson('config/i18n/onboarding-en-GB.json');
  const svHome = readJson('config/i18n/home-sv-SE.json');
  const enHome = readJson('config/i18n/home-en-GB.json');

  it('slim success renders child identity and generated PIN once', () => {
    assert.match(starter, /rememberSlimChildCredentials/);
    assert.match(starter, /slimHandoffHtml/);
    assert.match(starter, /id="slimHandoffName"/);
    assert.match(starter, /id="slimHandoffUsername"/);
    assert.match(starter, /id="slimHandoffPin"/);
    assert.match(starter, /id="slimCopyPin"/);
    assert.match(starter, /data-slim-handoff="credentials"/);
    assert.match(starter, /slimHandoffHtml\(\)/);
    assert.match(starter, /id="slimGoHome"/);
    assert.doesNotMatch(starter, /completeSignupAndRedirect\(['"]\/child-login/);
  });

  it('PIN stays in success-screen state, never in URL/href/analytics/mailto/storage', () => {
    assert.doesNotMatch(starter, PIN_URL_RE);
    assert.doesNotMatch(starter, PIN_HREF_RE);
    assert.doesNotMatch(starter, MAILTO_PIN_RE);
    assert.doesNotMatch(starter, /localStorage\.[a-zA-Z]+\([^)]*pin/i);
    assert.doesNotMatch(starter, /sessionStorage\.[a-zA-Z]+\([^)]*pin/i);
    assert.doesNotMatch(starter, /track\([^)]*pin/i);
    assert.match(starter, /completeSignupAndRedirect\('\/dashboard'\)/);
    assert.match(starter, /completeSignupAndRedirect\('\/schedule'\)/);
    assert.equal(sanitizeReturnUrl('/dashboard?pin=1234').includes('pin='), false);
  });

  it('A2 scan of new handoff surfaces stays green', () => {
    [starter, hub, handoff, read('public/dashboard.html')].forEach(function (src) {
      assert.doesNotMatch(src, PIN_URL_RE);
      assert.doesNotMatch(src, /[?&]child_pin=/i);
    });
    assert.match(hub, /familyChildPinEditorHref/);
    assert.match(hub, /\?tab=setup/);
    assert.doesNotMatch(hub, /\?pin=/);
  });

  it('Hem recovery CTA routes to Familj PIN editor without a secret', () => {
    assert.match(hub, /data-action="change-pin"/);
    assert.match(hub, /home\.handoff\.changePin/);
    assert.match(hub, /\/family\/child\/' \+ encodeURIComponent\(childId\) \+ '\?tab=setup/);
    assert.match(handoff, /data-action="change-pin"/);
    assert.match(read('public/dashboard.html'), /id="dashboardChangePinLink"/);
    assert.match(read('public/dashboard.html'), /href="\/family"/);
  });

  it('Swedish and English copy exist without placeholder keys', () => {
    const starterKeys = [
      'slimHandoffTitle',
      'slimHandoffBody',
      'slimHandoffName',
      'slimHandoffUsername',
      'slimHandoffPin',
      'slimHandoffCopyPin',
      'slimHandoffCopied',
    ];
    starterKeys.forEach(function (key) {
      assert.equal(typeof svOnboarding.starter[key], 'string', 'sv ' + key);
      assert.equal(typeof enOnboarding.starter[key], 'string', 'en ' + key);
      assert.ok(svOnboarding.starter[key].length > 2, 'sv empty ' + key);
      assert.ok(enOnboarding.starter[key].length > 2, 'en empty ' + key);
      assert.notEqual(svOnboarding.starter[key], 'onboarding.starter.' + key);
      assert.notEqual(enOnboarding.starter[key], 'onboarding.starter.' + key);
    });
    assert.equal(typeof svHome.handoff.changePin, 'string');
    assert.equal(typeof enHome.handoff.changePin, 'string');
    assert.match(svHome.handoff.changePin, /PIN/);
    assert.match(enHome.handoff.changePin, /PIN/i);
  });

  it('schedule save ingests rewards_ready only via seeded-reward helper', () => {
    assert.match(onboardingRoute, /ingestRoutineAndSeededRewards/);
    assert.match(onboardingRoute, /ingest-rewards-ready-if-seeded/);
    assert.equal((onboardingRoute.match(/ingestMilestoneAsync\(\{\s*familyId,\s*milestone: 'routine_ready'/g) || []).length, 0);
    const helper = read('src/lib/journey/ingest-rewards-ready-if-seeded.js');
    assert.match(helper, /is_active = true/);
    assert.match(helper, /milestone: 'rewards_ready'/);
    assert.match(helper, /no_rewards/);
    assert.doesNotMatch(helper, /INSERT INTO reward/);
  });

  it('non-slim starter save still uses wizard handoff, not slim success', () => {
    assert.match(starter, /function savePlan/);
    assert.match(starter, /enterChildHandoff/);
    assert.doesNotMatch(starter, /savePlan[\s\S]*showSlimSuccessAndGoHome/);
  });
});
