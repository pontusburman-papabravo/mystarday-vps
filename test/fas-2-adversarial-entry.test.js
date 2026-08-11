'use strict';

/**
 * Adversarial regression anchors for Fas 2 entry (no browser).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { resolveAppEntry, SERVER_ACTIONS } = require('../src/lib/app-entry-resolve');
const { toPublicEntryDecision } = require('../src/lib/app-entry-decision-public');

const ROOT = path.join(__dirname, '..');

describe('Fas 2 adversarial — resolver fail-closed', () => {
  const A = '00000000-0000-4000-8000-0000000000a1';
  const B = '00000000-0000-4000-8000-0000000000b2';

  it('deep-link child outside allowed scope → picker fail-closed', () => {
    const r = resolveAppEntry({
      trustedDevice: { valid: true, deviceMode: 'shared' },
      allowedChildren: [{ id: A }],
      deepLink: { childId: B },
      childSession: null,
      parentSession: null,
    });
    assert.equal(r.failClosed, true);
    assert.equal(r.reason, 'deep_link_child_out_of_scope');
  });

  it('child JWT on multi-profile shared device resumes active profile (no silent swap)', () => {
    const r = resolveAppEntry({
      trustedDevice: { valid: true, deviceMode: 'shared', defaultChildId: B },
      allowedChildren: [{ id: A }, { id: B }],
      allowedParents: [{ id: 'parent-1' }],
      childSession: { valid: true, childId: A },
      parentSession: null,
    });
    assert.equal(r.failClosed, false);
    assert.equal(r.destination, 'child-home');
    assert.equal(r.childId, A);
    assert.notEqual(r.childId, B);
  });

  it('handoff authenticated without privilege → not parent-home on shared', () => {
    const r = resolveAppEntry({
      parentSession: { authenticated: true, privilegeActive: false },
      parentPrivilegeActive: false,
      childSession: { valid: true, childId: A },
      trustedDevice: { valid: true, deviceMode: 'shared' },
      allowedChildren: [{ id: A }],
    });
    assert.notEqual(r.destination, 'parent-home');
    assert.equal(r.destination, 'child-home');
  });

  it('localDeviceModeHint child cannot override server parent device', () => {
    const r = resolveAppEntry({
      localDeviceModeHint: 'child',
      trustedDevice: { valid: true, deviceMode: 'parent' },
      allowedChildren: [{ id: A }],
      childSession: null,
      parentSession: null,
    });
    assert.equal(r.destination, 'parent-home');
    assert.equal(r.serverAction, SERVER_ACTIONS.RESTORE_PARENT);
  });
});

describe('Fas 2 adversarial — public decision sanitization', () => {
  it('toPublicEntryDecision never exposes token-like fields', () => {
    const pub = toPublicEntryDecision(
      resolveAppEntry({
        trustedDevice: { valid: true, deviceMode: 'child', defaultChildId: 'c1' },
        allowedChildren: [{ id: 'c1' }],
        childSession: null,
        parentSession: null,
      })
    );
    const keys = Object.keys(pub);
    for (const forbidden of ['token', 'refresh', 'cookie', 'pin', 'enroll_token', 'trusted_device']) {
      assert.ok(!keys.includes(forbidden), 'forbidden key ' + forbidden);
    }
    assert.equal(typeof pub.path, 'string');
  });
});

describe('Fas 2 adversarial — client wiring contracts', () => {
  it('SessionGate does not use DeviceMode when orchestrator active but decision pending', () => {
    const gate = fs.readFileSync(path.join(ROOT, 'public/js/session-gate.js'), 'utf8');
    assert.match(gate, /isDecisionApplied/);
    assert.match(gate, /return false;\s*\n\s*}\s*\n\s*const ctx/s);
  });

  it('orchestrator clears session state when flag off', () => {
    const orch = fs.readFileSync(path.join(ROOT, 'public/js/app-entry-orchestrator.js'), 'utf8');
    assert.match(orch, /clearOrchestratorSessionState/);
    assert.match(orch, /SERVER_ACTION_KEY/);
    assert.match(orch, /ALREADY_APPLIED/);
  });

  it('trusted bootstrap routes parent restore to dashboard not child today', () => {
    const boot = fs.readFileSync(path.join(ROOT, 'public/js/trusted-device-bootstrap.js'), 'utf8');
    assert.match(boot, /body\.user\.type === 'parent'/);
    assert.match(boot, /\/dashboard/);
  });

  it('buildAppEntryInput separates privilege from handoff auth', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/build-app-entry-input.js'), 'utf8');
    assert.match(src, /resolveParentPrivilegeActive/);
    assert.match(src, /privilegeEscalation/);
    assert.match(src, /parentAuthenticated = handoff\.ok/);
    assert.doesNotMatch(src, /parentPrivilegeActive = user\?\.type === 'parent'/);
  });

  it('trusted-device restore branches parent mode before child restore', () => {
    const route = fs.readFileSync(path.join(ROOT, 'src/routes/auth/trusted-device.js'), 'utf8');
    const idxParent = route.indexOf("device_mode === 'parent'");
    const idxChild = route.indexOf('restoreChildSessionFromDevice');
    assert.ok(idxParent > 0 && idxParent < idxChild);
  });
});
