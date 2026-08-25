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

  it('fail closed: an invalid/expired lease never produces a verified resume', () => {
    const h = loadOrchestratorSandbox({ pathname: '/dashboard', deviceMode: 'child' });
    const Orch = h.sandbox.window.AppEntryOrchestrator;

    assert.equal(Orch.commitVerifiedParentResume('/dashboard', h.getNow() - 1000), false);
    assert.equal(Orch.commitVerifiedParentResume('/dashboard', null), false);
    assert.equal(Orch.commitVerifiedParentResume('/dashboard', 'not-a-timestamp'), false);
    assert.equal(Orch.isExplicitParentResumeActive(), false);
  });
});
