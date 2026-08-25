'use strict';

/**
 * P1 stability — atomic child→adult profile switch.
 *
 * Repro of the "picker loop": after selecting an adult on a shared device,
 * the picker used to navigate with only a *pending* resume marker, and the
 * destination page re-verified via /me + /status. Any transient failure of that
 * second verification rejected the resume and the server's authoritative app-entry
 * decision (profile-picker for a multi-child shared device) bounced the user back
 * to the picker — child → PIN → picker → child → PIN → picker …
 *
 * The atomic fix: the picker has already server-verified the EXACT selected parent
 * (select-parent + /me id match) and holds the authoritative lease, so it commits a
 * *verified* resume and pre-applies the parent-home decision. The destination page
 * then trusts it and never re-runs the racey second verification — no loop.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadOrchestratorSandbox } = require('./helpers/app-entry-orchestrator-harness');
const { pickParent } = require('./helpers/child-profile-picker-harness');

function pickerAppEntryBody() {
  return {
    orchestratorActive: true,
    dailyUxActive: true,
    allowedChildren: [{ id: 'child-1' }, { id: 'child-2' }],
    allowedParents: [{ id: 'parent-1' }],
    pinRequiredForParents: true,
    // If the destination page ever re-fetches app-entry after a verified resume,
    // this authoritative decision would bounce the user straight back to the picker.
    decision: {
      destination: 'profile-picker',
      viewContext: 'picker',
      credentialContext: 'none',
      deviceMode: 'shared',
      childId: null,
      reason: 'shared_device_picker_required',
      serverAction: 'select-child',
      path: '/child/profile-picker',
    },
  };
}

describe('atomic parent resume — child→adult switch cannot loop back to picker', () => {
  it('commitVerifiedParentResume marks a verified, applied parent-home resume', () => {
    const h = loadOrchestratorSandbox({ pathname: '/dashboard', deviceMode: 'child' });
    const Orch = h.sandbox.window.AppEntryOrchestrator;

    const lease = h.getNow() + 15 * 60 * 1000;
    const committed = Orch.commitVerifiedParentResume('/dashboard', lease);

    assert.equal(committed, true, 'valid future lease produces a verified resume');
    assert.equal(Orch.isExplicitParentResumeActive(), true, 'resume is verified + applied');
    assert.equal(Orch.isExplicitParentResumePending(), false, 'not merely pending');
    const decision = Orch.getAppliedDecision();
    assert.equal(decision.destination, 'parent-home');
    assert.equal(decision.viewContext, 'parent');
    assert.equal(h.sandbox.window.DeviceMode.isChildMode(), false, 'device mode switched to parent');
  });

  it('destination cold start trusts the verified resume — no app-entry re-fetch, no picker bounce', async () => {
    const h = loadOrchestratorSandbox({
      pathname: '/dashboard',
      deviceMode: 'child',
      appEntryBody: pickerAppEntryBody(),
    });
    const Orch = h.sandbox.window.AppEntryOrchestrator;

    const lease = h.getNow() + 15 * 60 * 1000;
    assert.equal(Orch.commitVerifiedParentResume('/dashboard', lease), true);

    const result = await Orch.runColdStart({ source: 'test_destination' });

    assert.equal(result.ok, true);
    assert.equal(result.code, 'EXPLICIT_PARENT_RESUME');
    assert.equal(result.decision.destination, 'parent-home');
    const appEntryFetches = h.fetchCalls.filter((c) => c.url.indexOf('/api/auth/app-entry') !== -1);
    assert.equal(appEntryFetches.length, 0, 'must NOT re-fetch app-entry when resume is verified');
    const pickerRedirects = h.redirects.filter((u) => u.indexOf('/child/profile-picker') !== -1);
    assert.equal(pickerRedirects.length, 0, 'must NOT bounce back to the profile picker');
  });

  it('fail closed (A): invalid/missing/expired lease → no verified, no pending, no parent DeviceMode', () => {
    for (const badLease of [null, undefined, '', 'not-a-timestamp', 0]) {
      const h = loadOrchestratorSandbox({ pathname: '/dashboard', deviceMode: 'child' });
      const Orch = h.sandbox.window.AppEntryOrchestrator;
      assert.equal(Orch.commitVerifiedParentResume('/dashboard', badLease), false, 'lease ' + badLease);
      assert.equal(Orch.isExplicitParentResumeActive(), false, 'not active for ' + badLease);
      assert.equal(Orch.isExplicitParentResumePending(), false, 'no dangling pending marker for ' + badLease);
      assert.equal(h.sandbox.window.DeviceMode.isChildMode(), true, 'device mode untouched for ' + badLease);
      assert.equal(h.redirects.length, 0, 'no navigation for ' + badLease);
    }
    // Expired (past) lease is likewise rejected without a pending marker.
    const h2 = loadOrchestratorSandbox({ pathname: '/dashboard', deviceMode: 'child' });
    const Orch2 = h2.sandbox.window.AppEntryOrchestrator;
    assert.equal(Orch2.commitVerifiedParentResume('/dashboard', h2.getNow() - 1000), false);
    assert.equal(Orch2.isExplicitParentResumePending(), false);
    assert.equal(Orch2.isExplicitParentResumeActive(), false);
  });
});

describe('atomic parent resume — picker never navigates on an unusable lease', () => {
  it('B: unlock ok:true but missing/invalid lease → stay on picker, no nav, button re-enabled', async () => {
    const r = await pickParent({
      hasAppPin: true,
      parentId: 'parent-1',
      unlockResult: { ok: true, redirect: '/dashboard', privilegeLeaseUntil: null },
    });
    assert.equal(r.redirects.length, 0, 'no navigation on an unusable lease');
    assert.equal(r.committedVerified, false, 'no verified resume committed');
    assert.equal(r.pendingResume, false, 'no dangling pending marker');
    assert.equal(r.enteredParent, false, 'no early parent DeviceMode mutation');
    assert.equal(r.btnDisabled, false, 'selected profile button re-enabled');
  });

  it('D: valid exact parent + valid future lease → one commit, one navigation', async () => {
    const r = await pickParent({ hasAppPin: true, parentId: 'parent-1' });
    assert.equal(r.redirects.length, 1, 'exactly one navigation');
    assert.equal(r.redirects[0], '/dashboard');
    assert.equal(r.committedVerified, true);
    assert.equal(r.pendingResume, false);
    assert.equal(r.enteredParent, true, 'parent DeviceMode applied via the verified commit');
  });
});
