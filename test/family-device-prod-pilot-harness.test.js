'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  PILOT_EMAIL_RE,
  isFamilyDevicePilotDisposableEmail,
  assertFamilyDevicePilotDisposableEmail,
  assertProdPilotEnvironment,
  redactSecrets,
} = require('../src/lib/family-device-pilot-guard');
const {
  makeDisposableEmail,
  runFamilyDeviceProdPilot,
} = require('../scripts/ops/family-device-prod-pilot-core.cjs');
const { isFounderQaParentEmail } = require('../src/lib/founder-qa-family-guard');

test('pilot guard: disposable email marker', () => {
  const email = makeDisposableEmail();
  assert.match(email, PILOT_EMAIL_RE);
  assert.equal(isFamilyDevicePilotDisposableEmail(email), true);
  assert.throws(() => assertFamilyDevicePilotDisposableEmail('rc1-qa-parent@qa-automation.example'), /refused/);
});

test('pilot guard: refuses founder email for disposable assert', () => {
  const founder = process.env.FOUNDER_QA_EMAIL;
  if (founder) {
    assert.throws(() => assertFamilyDevicePilotDisposableEmail(founder), /refused/);
    assert.equal(isFounderQaParentEmail(founder), true);
  }
});

test('pilot guard: prod environment fails closed without confirm', () => {
  assert.throws(
    () =>
      assertProdPilotEnvironment({
        SMOKE_BASE_URL: 'https://example.test',
        FAMILY_DEVICE_PILOT_ALLOWED_BASES: 'https://example.test',
        FAMILY_DEVICE_PILOT_CONFIRM: '',
      }),
    /FAMILY_DEVICE_PILOT_CONFIRM/
  );
});

test('pilot guard: wrong base URL fails closed', () => {
  assert.throws(
    () =>
      assertProdPilotEnvironment({
        SMOKE_BASE_URL: 'http://localhost:3000',
        FAMILY_DEVICE_PILOT_ALLOWED_BASES: 'https://example.test',
        FAMILY_DEVICE_PILOT_CONFIRM: '1',
      }),
    /not allowlisted/
  );
});

test('pilot harness source: no founder password env requirement', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../scripts/ops/family-device-prod-pilot-core.cjs'),
    'utf8'
  );
  assert.doesNotMatch(src, /FOUNDER_QA_PASSWORD/);
  assert.doesNotMatch(src, /FOUNDER_CHILD_PIN/);
  assert.match(src, /fd-pilot-/);
});

test('pilot harness: redacts secrets in logs', () => {
  const sample = 'Bearer abc.def token trusted_device=secret access_token=xyz password:"x" pin:"1234"';
  const red = redactSecrets(sample);
  assert.doesNotMatch(red, /abc\.def/);
  assert.doesNotMatch(red, /trusted_device=secret/);
});

test('pilot core: dry-run does not require db writes', async () => {
  const report = await runFamilyDeviceProdPilot({
    db: null,
    baseUrl: 'https://example.test',
    dryRun: true,
  });
  assert.equal(report.dryRun, true);
  assert.equal(report.ok, true);
});

test('pilot db module: global flag keys are allowlisted only', () => {
  const dbSrc = fs.readFileSync(path.join(__dirname, '../db/family-feature-overrides.js'), 'utf8');
  for (const key of [
    'trusted_device_v1',
    'family_device_entry_v1',
    'adult_privilege_v1',
    'family_device_daily_ux_v1',
  ]) {
    assert.match(dbSrc, new RegExp(`'${key}'`));
  }
});
