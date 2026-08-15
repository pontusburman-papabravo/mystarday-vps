'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const runtime = require('./helpers/family-runtime-integration-harness');
const picker = require('./helpers/child-profile-picker-harness');

describe('Family Device acceptance — Family boot ownership', () => {
  it('FAMILY_HARD_LOAD: exactly one init and GET /api/family, skeleton replaced', async () => {
    const result = await runtime.runFamilyHardLoad({ id: 'fam-1', name: 'Hard load', children: [] });
    assert.equal(result.pageBootOwnsThisLoad, false);
    assert.equal(result.familyCalls, 1);
    assert.equal(result.hooks.getState().familyData.name, 'Hard load');
    assert.equal(result.skeletonHidden, true);
    assert.equal(result.dataVisible, true);
  });

  it('FAMILY_HARD_LOAD_ASYNC_RACE: PageBoot appearing during authGuard still inits once', async () => {
    const result = await runtime.runFamilyHardLoadAsyncPageBootRace({
      id: 'fam-1',
      name: 'Race load',
      children: [],
    });
    assert.equal(result.pageBootOwnsThisLoad, false, 'ownership captured before PageBoot exists');
    assert.equal(result.pageBootPresentDuringAwait, true);
    assert.equal(result.familyCalls, 1, 'must not skip init after PageBoot appears mid-await');
    assert.equal(result.name, 'Race load');
    assert.equal(result.skeletonHidden, true);
    assert.equal(result.dataVisible, true);
  });

  it('FAMILY_FIRST_SOFT_NAV: NativeTabBar → Router loads Family once', async () => {
    const flow = await runtime.runNativeTabFamilyFlow();
    assert.equal(flow.first.familyCalls, 1);
    assert.equal(flow.firstName, 'First tab');
    assert.equal(flow.first.skeleton.classList.contains('hidden'), true);
    assert.equal(flow.first.dataSections.classList.contains('hidden'), false);
  });

  it('FAMILY_ACTIVE_TAB_RECLICK: stays rendered, no duplicate load, no skeleton', async () => {
    const flow = await runtime.runNativeTabFamilyFlow();
    assert.equal(flow.reclick.familyCalls, 0, 'active Family tab must not refetch');
    assert.equal(flow.firstName, 'First tab');
    assert.equal(flow.reclick.skeleton.classList.contains('hidden'), true);
    assert.equal(flow.reclick.dataSections.classList.contains('hidden'), false);
  });

  it('FAMILY_LEAVE_AND_REVISIT: one fresh load then stable reclick', async () => {
    const flow = await runtime.runNativeTabFamilyFlow();
    assert.equal(flow.revisit.familyCalls, 1);
    assert.equal(flow.revisitName, 'After leave');
    assert.equal(flow.revisit.skeleton.classList.contains('hidden'), true);
    assert.equal(flow.again.familyCalls, 0);
    assert.equal(flow.again.skeleton.classList.contains('hidden'), true);
  });

  it('FAMILY_429: recoverable banner, no login redirect', async () => {
    const err429 = Object.assign(new Error('För många förfrågningar'), {
      status: 429,
      body: { retry_after: 1 },
    });
    const fail = await runtime.runFamilyInitFailure(err429);
    assert.equal(fail.tracker.count('/api/family'), 1);
    assert.equal(fail.hooks.getState().familyData, null);
    assert.equal(fail.banner.classList.contains('hidden'), false);
    assert.notEqual(fail.sandbox.location.href, '/login');
  });

  it('family.js captures PageBoot ownership at module execution', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/family.js'), 'utf8');
    assert.match(src, /pageBootOwnsThisLoad/);
    assert.match(src, /registerFamilyInitWithPageBoot/);
    assert.doesNotMatch(src, /addEventListener\('stjarndag-magic-navigated'[\s\S]{0,160}init\(\)/);
  });
});

describe('Family Device acceptance — shared adult PIN boundary', () => {
  it('SHARED_FORCE_CLOSE_EXISTING_PARENT_COOKIE: matching /api/auth/me cannot bypass gate', async () => {
    const result = await picker.pickParent({
      parentId: 'parent-1',
      meParentId: 'parent-1',
      unlockResult: { ok: true, redirect: '/dashboard' },
    });
    assert.equal(result.unlockCalls.length, 1);
    assert.equal(result.unlockCalls[0].parentId, 'parent-1');
    assert.ok(result.redirects.some(function (u) { return String(u).indexOf('/dashboard') !== -1; }));
  });

  it('SHARED_WRONG_PIN: no parent access', async () => {
    const result = await picker.pickParent({
      parentId: 'parent-1',
      meParentId: 'parent-1',
      unlockResult: { ok: false, code: 'PARENT_PIN_INVALID' },
    });
    assert.equal(result.unlockCalls.length, 1);
    assert.equal(result.redirects.length, 0);
    assert.equal(result.enteredParent, false);
  });

  it('SHARED_CANCEL_PIN: no parent access', async () => {
    const result = await picker.pickParent({
      parentId: 'parent-1',
      unlockResult: { ok: false, code: 'PIN_CANCEL' },
    });
    assert.equal(result.unlockCalls.length, 1);
    assert.equal(result.redirects.length, 0);
    assert.equal(result.enteredParent, false);
  });

  it('SHARED_CORRECT_PIN: parent access after AdultPrivilege unlock', async () => {
    const result = await picker.pickParent({
      parentId: 'parent-1',
      unlockResult: { ok: true, redirect: '/dashboard' },
    });
    assert.equal(result.unlockCalls.length, 1);
    assert.equal(result.enteredParent, true);
    assert.equal(result.decision && result.decision.destination, 'parent-home');
  });

  it('CHILD_PINLESS: child pick does not request adult unlock', async () => {
    const result = await picker.pickChild('child-1');
    assert.deepEqual(result.childPicks, ['child-1']);
    assert.equal(result.unlockCalls.length, 0);
  });

  it('PARENT_DEVICE_COLD_START contract remains orchestrator-owned', () => {
    const orch = fs.readFileSync(path.join(ROOT, 'public/js/app-entry-orchestrator.js'), 'utf8');
    const pickerSrc = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-picker.js'), 'utf8');
    assert.match(orch, /parent-home/);
    assert.doesNotMatch(pickerSrc, /resumeParentIfSessionMatches/);
    assert.match(pickerSrc, /requestTrustedProfileUnlock/);
  });

  it('BACKGROUND_FOREGROUND lease/grace remains AdultPrivilege-owned, not cookie identity', () => {
    const policy = require('../src/lib/adult-privilege-lease-policy');
    assert.equal(policy.leaseApplies('parent'), false);
    assert.equal(policy.leaseApplies('shared'), true);
    assert.ok(policy.PARENT_DEVICE_BACKGROUND_GRACE_MS > 0);
    assert.ok(policy.backgroundGraceMs('parent') > 0);
    const pickerSrc = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-picker.js'), 'utf8');
    assert.doesNotMatch(pickerSrc, /resumeParentIfSessionMatches/);
  });
});

describe('Family Device acceptance — #1007 preserved', () => {
  it('SharedFamilyFetch stays in-flight-only', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/shared-family-fetch.js'), 'utf8');
    assert.doesNotMatch(src, /__familyWarmData/);
    assert.doesNotMatch(src, /getCached/);
    assert.match(src, /__familyWarmFetch/);
  });

  it('Settings bootstrap still separates session from family load', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/settings-page-bootstrap.js'), 'utf8');
    assert.match(src, /validateSession/);
    assert.match(src, /loadFamilyData/);
    assert.match(src, /isTransientApiFailure/);
  });
});
