'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  PILOT_EMAIL_RE,
  isActivityTimerPilotDisposableEmail,
  assertActivityTimerPilotDisposableEmail,
  assertProdPilotEnvironment,
  redactSecrets,
} = require('../src/lib/activity-timer-pilot-guard');
const {
  makeDisposableEmail,
  runActivityTimerProdPilot,
} = require('../scripts/ops/activity-timer-prod-pilot-core.cjs');
const { isFounderQaParentEmail } = require('../src/lib/founder-qa-family-guard');

test('pilot guard: disposable email marker', () => {
  const email = makeDisposableEmail();
  assert.match(email, PILOT_EMAIL_RE);
  assert.equal(isActivityTimerPilotDisposableEmail(email), true);
  assert.throws(() => assertActivityTimerPilotDisposableEmail('rc1-qa-parent@qa-automation.example'), /refused/);
});

test('pilot guard: refuses founder email for disposable assert', () => {
  const founder = process.env.FOUNDER_QA_EMAIL;
  if (founder) {
    assert.throws(() => assertActivityTimerPilotDisposableEmail(founder), /refused/);
    assert.equal(isFounderQaParentEmail(founder), true);
  }
});

test('pilot guard: prod environment fails closed without confirm', () => {
  assert.throws(
    () =>
      assertProdPilotEnvironment({
        SMOKE_BASE_URL: 'https://example.test',
        ACTIVITY_TIMER_PILOT_ALLOWED_BASES: 'https://example.test',
        ACTIVITY_TIMER_PILOT_CONFIRM: '',
      }),
    /ACTIVITY_TIMER_PILOT_CONFIRM/
  );
});

test('pilot guard: wrong base URL fails closed', () => {
  assert.throws(
    () =>
      assertProdPilotEnvironment({
        SMOKE_BASE_URL: 'http://localhost:3000',
        ACTIVITY_TIMER_PILOT_ALLOWED_BASES: 'https://example.test',
        ACTIVITY_TIMER_PILOT_CONFIRM: '1',
      }),
    /not allowlisted/
  );
});

test('pilot harness source: no founder password env requirement', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../scripts/ops/activity-timer-prod-pilot-core.cjs'),
    'utf8'
  );
  assert.doesNotMatch(src, /FOUNDER_QA_PASSWORD/);
  assert.doesNotMatch(src, /FOUNDER_CHILD_PIN/);
  assert.match(src, /createDisposableActivityTimerQaFamily/);
  assert.match(src, /restoreChildTimerSettings/);
  assert.match(src, /deletePilotFamily/);
});

test('pilot harness: redacts secrets in logs', () => {
  const sample = 'Bearer abc.def token access_token=secret refresh_token=xyz password:"x" pin:"1234"';
  const red = redactSecrets(sample);
  assert.doesNotMatch(red, /abc\.def/);
  assert.doesNotMatch(red, /access_token=secret/);
});

test('pilot core: dry-run does not require db writes', async () => {
  const report = await runActivityTimerProdPilot({
    db: null,
    baseUrl: 'https://example.test',
    dryRun: true,
  });
  assert.equal(report.scenarios.DRY_RUN, 'PASS');
  assert.equal(report.cleanup.ok, true);
});

test('qa fixture: default activity_timers_enabled false on insert', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../scripts/ops/activity-timer-qa-fixture.cjs'),
    'utf8'
  );
  assert.match(src, /activity_timers_enabled[\s\S]{0,120}false/);
  assert.doesNotMatch(src, /activity_timers_enabled = true WHERE family_id/);
});
