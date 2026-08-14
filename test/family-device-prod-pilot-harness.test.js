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
  assert.match(src, /createDisposableFamilyDeviceQaFamily/);
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

test('device setup prompt: mutations use apiFetch (CSRF)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../public/js/device-setup-prompt.js'), 'utf8');
  assert.match(src, /window\.apiFetch\([^)]*this-device\/setup/);
  assert.doesNotMatch(src, /fetch\('\/api\/family\/trusted-devices\/this-device\/setup'/);
});

test('pilot harness: fixture path does not call public register', () => {
  const files = [
    '../scripts/ops/family-device-prod-pilot-core.cjs',
    '../scripts/ops/family-device-qa-fixture.cjs',
    '../scripts/ops/family-device-prod-pilot.mjs',
  ];
  for (const rel of files) {
    const src = fs.readFileSync(path.join(__dirname, rel), 'utf8');
    assert.doesNotMatch(src, /\/api\/auth\/register/);
    assert.doesNotMatch(src, /auth\/register/);
  }
  const core = fs.readFileSync(
    path.join(__dirname, '../scripts/ops/family-device-prod-pilot-core.cjs'),
    'utf8'
  );
  assert.match(core, /createDisposableFamilyDeviceQaFamily/);
  assert.match(core, /fixtureCreationMethod:\s*'db_ops'/);
});

test('pilot qa fixture: refuses pontus@burman.cc', async () => {
  const { createDisposableFamilyDeviceQaFamily } = require('../scripts/ops/family-device-qa-fixture.cjs');
  const prev = process.env.FAMILY_DEVICE_PILOT_CONFIRM;
  process.env.FAMILY_DEVICE_PILOT_CONFIRM = '1';
  try {
    await assert.rejects(
      () =>
        createDisposableFamilyDeviceQaFamily(
          { getClient: () => ({ query: async () => ({ rows: [] }), release: () => {} }) },
          { childCount: 1, email: 'pontus@burman.cc' }
        ),
      /refused|not fd-pilot/
    );
  } finally {
    if (prev === undefined) delete process.env.FAMILY_DEVICE_PILOT_CONFIRM;
    else process.env.FAMILY_DEVICE_PILOT_CONFIRM = prev;
  }
});

test('pilot qa fixture: refuses non-disposable email', async () => {
  const { createDisposableFamilyDeviceQaFamily } = require('../scripts/ops/family-device-qa-fixture.cjs');
  process.env.FAMILY_DEVICE_PILOT_CONFIRM = '1';
  await assert.rejects(
    () =>
      createDisposableFamilyDeviceQaFamily(
        { getClient: () => ({ query: async () => ({ rows: [] }), release: () => {} }) },
        { childCount: 1, email: 'customer@example.com' }
      ),
    /not fd-pilot/
  );
});

test('pilot qa fixture: requires FAMILY_DEVICE_PILOT_CONFIRM', async () => {
  const { createDisposableFamilyDeviceQaFamily } = require('../scripts/ops/family-device-qa-fixture.cjs');
  const prev = process.env.FAMILY_DEVICE_PILOT_CONFIRM;
  delete process.env.FAMILY_DEVICE_PILOT_CONFIRM;
  try {
    await assert.rejects(
      () =>
        createDisposableFamilyDeviceQaFamily(
          { getClient: () => ({ query: async () => ({ rows: [] }), release: () => {} }) },
          { childCount: 1 }
        ),
      /FAMILY_DEVICE_PILOT_CONFIRM/
    );
  } finally {
    if (prev !== undefined) process.env.FAMILY_DEVICE_PILOT_CONFIRM = prev;
  }
});

test('pilot harness: cleanup finally deletes disposable families', () => {
  const core = fs.readFileSync(
    path.join(__dirname, '../scripts/ops/family-device-prod-pilot-core.cjs'),
    'utf8'
  );
  assert.match(core, /finally\s*\{/);
  assert.match(core, /deletePilotFamily/);
  assert.match(core, /countPilotOverrides/);
  assert.match(core, /countGlobalStaleFdPilotRows/);
  assert.match(core, /stale\.families === 0/);
});

test('pilot core: report.ok requires verified cleanup and SHARED_ONE_CHILD', () => {
  const core = fs.readFileSync(
    path.join(__dirname, '../scripts/ops/family-device-prod-pilot-core.cjs'),
    'utf8'
  );
  assert.match(core, /withFamilyDevicePilotLock/);
  assert.match(core, /report\.cleanup\?\.ok === true/);
  assert.match(core, /SELECT_PARENT_PIN_SERVER/);
  assert.match(core, /SHARED_ONE_CHILD_SERVER === 'PASS'/);
  assert.match(core, /widgetOverrideWrites === 0/);
  assert.match(core, /parentId: fixture\.parentId/);
  assert.doesNotMatch(core, /WIDGET_SERVER_SCOPE/);
});

test('pilot harness Scenario H: select-parent uses canonical unlock_method payload', () => {
  const core = fs.readFileSync(
    path.join(__dirname, '../scripts/ops/family-device-prod-pilot-core.cjs'),
    'utf8'
  );
  const scenarioH = core.match(
    /\/\/ H — select-parent:[\s\S]*?report\.scenarios\.SELECT_PARENT_PIN_SERVER/
  )?.[0];
  assert.ok(scenarioH, 'Scenario H block must exist');

  const selectParentCalls = scenarioH.match(/selectParent\(/g) || [];
  assert.equal(selectParentCalls.length, 2, 'Scenario H must call selectParent exactly twice');

  const unlockMethodSnake = scenarioH.match(/unlock_method:\s*'pin'/g) || [];
  assert.equal(unlockMethodSnake.length, 2, 'Scenario H must send unlock_method on both calls');

  const unlockMethodCamel = scenarioH.match(/unlockMethod:\s*'pin'/g) || [];
  assert.equal(unlockMethodCamel.length, 0, 'Scenario H must not send camelCase unlockMethod');

  assert.match(
    scenarioH,
    /const wrongPin = await selectParent\([\s\S]*?\{ unlock_method: 'pin', pin: '0000' \}/
  );
  assert.match(
    scenarioH,
    /const okPin = await selectParent\([\s\S]*?\{ unlock_method: 'pin', pin: pinFam\.parentPin \}/
  );

  const selectParentHelper = core.match(/async function selectParent[\s\S]*?^}/m)?.[0];
  assert.ok(selectParentHelper, 'selectParent helper must exist');
  assert.match(selectParentHelper, /body:\s*\{\s*parent_id:\s*parentId/);
  assert.match(selectParentHelper, /\/api\/auth\/trusted-device\/select-parent/);
});

test('pilot harness JSON: both SHARED_ONE_CHILD and SELECT_PARENT_PIN visible; widgets excluded', () => {
  const mjs = fs.readFileSync(
    path.join(__dirname, '../scripts/ops/family-device-prod-pilot.mjs'),
    'utf8'
  );
  assert.match(mjs, /SHARED_ONE_CHILD_SERVER:/);
  assert.match(mjs, /SELECT_PARENT_PIN_SERVER:/);
  assert.match(mjs, /WIDGET_OVERRIDE_WRITES/);
  assert.doesNotMatch(mjs, /WIDGET_SERVER_SCOPE/);
  assert.match(mjs, /PILOT_LOCK_BUSY/);
});

test('pilot guard: Family Device allowlist excludes widget flags', () => {
  const {
    FAMILY_DEVICE_PILOT_FLAG_KEYS,
    WIDGET_PILOT_FLAG_KEYS,
  } = require('../src/lib/family-device-pilot-guard');
  for (const key of WIDGET_PILOT_FLAG_KEYS) {
    assert.ok(!FAMILY_DEVICE_PILOT_FLAG_KEYS.includes(key), key);
  }
  assert.equal(FAMILY_DEVICE_PILOT_FLAG_KEYS.length, 4);
});

test('pilot harness: does not mutate global feature_flag enable', () => {
  const dbPilot = fs.readFileSync(
    path.join(__dirname, '../scripts/ops/family-device-pilot-db.cjs'),
    'utf8'
  );
  assert.doesNotMatch(dbPilot, /UPDATE feature_flag SET enabled\s*=\s*true/i);
  assert.match(dbPilot, /family_feature_override/);
});

test('registration rate limiter: unchanged prod signup cap', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/middleware/rateLimiter.js'), 'utf8');
  assert.match(src, /Registration limiter: 3 registrations per hour per IP/);
  assert.match(src, /config\.rateLimits\.registration/);
});
