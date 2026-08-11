'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveAppEntry,
  DESTINATIONS,
  SERVER_ACTIONS,
} = require('../src/lib/app-entry-resolve');

const A = 'child-a-uuid';
const B = 'child-b-uuid';
const C = 'child-c-uuid';

function td(mode, extra) {
  return {
    valid: true,
    revoked: false,
    deviceMode: mode,
    defaultChildId: null,
    lastActiveChildId: null,
    ...extra,
  };
}

function assertChildHome(result, childId, deviceMode) {
  assert.equal(result.destination, DESTINATIONS.CHILD_HOME);
  assert.equal(result.viewContext, 'child');
  assert.equal(result.credentialContext, 'child');
  assert.equal(result.childId, childId);
  assert.equal(result.deviceMode, deviceMode);
}

function assertParentHome(result, deviceMode) {
  assert.equal(result.destination, DESTINATIONS.PARENT_HOME);
  assert.equal(result.viewContext, 'parent');
  assert.equal(result.credentialContext, 'parent');
  assert.equal(result.deviceMode, deviceMode);
}

describe('resolveAppEntry — decision matrix (Fas 2A)', () => {
  it('no valid family/device auth → parent-login', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: null,
      trustedDevice: null,
      allowedChildren: [],
    });
    assert.equal(r.destination, DESTINATIONS.PARENT_LOGIN);
    assert.equal(r.credentialContext, 'none');
    assert.equal(r.reason, 'no_family_or_device_auth');
  });

  it('parent device + active parent privilege → parent-home', () => {
    const r = resolveAppEntry({
      parentPrivilegeActive: true,
      parentSession: { authenticated: true, privilegeActive: true },
      childSession: null,
      trustedDevice: td('parent'),
      allowedChildren: [{ id: A }],
    });
    assertParentHome(r, 'parent');
  });

  it('parent device without parent privilege → parent-home restore-parent', () => {
    const r = resolveAppEntry({
      parentSession: { authenticated: true, privilegeActive: false },
      childSession: null,
      trustedDevice: td('parent'),
      allowedChildren: [{ id: A }],
    });
    assert.equal(r.destination, DESTINATIONS.PARENT_HOME);
    assert.equal(r.serverAction, SERVER_ACTIONS.RESTORE_PARENT);
    assert.equal(r.deviceMode, 'parent');
    assert.equal(r.credentialContext, 'none');
  });

  it('parent device with child session (no parent privilege) → child home', () => {
    const r = resolveAppEntry({
      parentSession: { authenticated: true, privilegeActive: false },
      parentPrivilegeActive: false,
      childSession: { valid: true, childId: A },
      trustedDevice: td('parent'),
      allowedChildren: [{ id: A }],
    });
    assertChildHome(r, A, 'parent');
  });

  it('child device + valid binding → bound child home', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: null,
      trustedDevice: td('child', { defaultChildId: A }),
      allowedChildren: [{ id: A }],
    });
    assertChildHome(r, A, 'child');
    assert.equal(r.serverAction, SERVER_ACTIONS.RESTORE_CHILD);
  });

  it('shared + exactly one allowed child → child home', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: null,
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }],
    });
    assertChildHome(r, A, 'shared');
  });

  it('shared + multiple children + default child → profile-picker (Netflix)', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: null,
      trustedDevice: td('shared', { defaultChildId: B }),
      allowedChildren: [{ id: A }, { id: B }],
    });
    assert.equal(r.destination, DESTINATIONS.PROFILE_PICKER);
    assert.equal(r.viewContext, 'picker');
    assert.equal(r.credentialContext, 'none');
  });

  it('shared + one child + one parent → profile-picker', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: null,
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }],
      allowedParents: [{ id: 'parent-uuid' }],
    });
    assert.equal(r.destination, DESTINATIONS.PROFILE_PICKER);
    assert.equal(r.viewContext, 'picker');
  });

  it('shared + multiple children without default → profile-picker', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: null,
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }, { id: B }],
    });
    assert.equal(r.destination, DESTINATIONS.PROFILE_PICKER);
    assert.equal(r.viewContext, 'picker');
    assert.equal(r.credentialContext, 'none');
    assert.equal(r.serverAction, SERVER_ACTIONS.SELECT_CHILD);
  });

  it('child id not in allowed list (bound) → fail closed picker', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: null,
      trustedDevice: td('child', { defaultChildId: C }),
      allowedChildren: [{ id: A }],
    });
    assert.equal(r.destination, DESTINATIONS.PROFILE_PICKER);
    assert.equal(r.failClosed, true);
    assert.equal(r.reason, 'bound_child_not_allowed');
  });

  it('revoked trusted device → parent-login fail closed', () => {
    const r = resolveAppEntry({
      parentSession: { valid: true },
      childSession: null,
      trustedDevice: { valid: true, revoked: true, deviceMode: 'shared' },
      allowedChildren: [{ id: A }],
    });
    assert.equal(r.destination, DESTINATIONS.PARENT_LOGIN);
    assert.equal(r.failClosed, true);
    assert.equal(r.credentialContext, 'none');
  });

  it('shared: parent authenticated + privilege locked → child path not parent-home', () => {
    const r = resolveAppEntry({
      parentSession: { authenticated: true, privilegeActive: false },
      parentPrivilegeActive: false,
      childSession: null,
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }],
    });
    assertChildHome(r, A, 'shared');
    assert.notEqual(r.destination, DESTINATIONS.PARENT_HOME);
  });

  it('shared: parent privilege active → parent-home', () => {
    const r = resolveAppEntry({
      parentPrivilegeActive: true,
      parentSession: { authenticated: true, privilegeActive: true },
      childSession: null,
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }],
    });
    assertParentHome(r, 'shared');
  });

  it('shared + multiple children + active child session → child home (resume profile)', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: { valid: true, childId: A },
      trustedDevice: td('shared', { defaultChildId: B }),
      allowedChildren: [{ id: A }, { id: B }],
      allowedParents: [{ id: 'parent-uuid' }],
    });
    assert.equal(r.failClosed, false);
    assertChildHome(r, A, 'shared');
    assert.equal(r.serverAction, SERVER_ACTIONS.NONE);
  });

  it('child session not in allowed → fail closed', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: { valid: true, childId: C },
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }],
    });
    assert.equal(r.failClosed, true);
    assert.equal(r.reason, 'child_session_not_allowed');
  });

  it('deep-link child outside scope → fail closed picker', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: null,
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }],
      deepLink: { childId: B },
    });
    assert.equal(r.failClosed, true);
    assert.equal(r.reason, 'deep_link_child_out_of_scope');
  });

  it('deep-link child in scope → that child home', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: null,
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }, { id: B }],
      deepLink: { childId: B },
    });
    assertChildHome(r, B, 'shared');
    assert.equal(r.reason, 'deep_link_child_home');
  });

  it('legacy parent privilege without trusted device → parent-home', () => {
    const r = resolveAppEntry({
      parentPrivilegeActive: true,
      parentSession: { authenticated: true, privilegeActive: true },
      childSession: null,
      trustedDevice: null,
      allowedChildren: [],
    });
    assertParentHome(r, null);
  });

  it('matching child session on single-child shared → no restore action', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: { valid: true, childId: A },
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }],
    });
    assertChildHome(r, A, 'shared');
    assert.equal(r.serverAction, SERVER_ACTIONS.NONE);
  });

  it('shared + invalid default child id → profile-picker (default ignored)', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: null,
      trustedDevice: td('shared', { defaultChildId: C }),
      allowedChildren: [{ id: A }, { id: B }],
    });
    assert.equal(r.failClosed, false);
    assert.equal(r.destination, DESTINATIONS.PROFILE_PICKER);
    assert.equal(r.reason, 'shared_device_picker_required');
  });

  it('shared with zero allowed children → device-setup', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: null,
      trustedDevice: td('shared'),
      allowedChildren: [],
    });
    assert.equal(r.destination, DESTINATIONS.DEVICE_SETUP);
    assert.equal(r.failClosed, true);
  });
});

describe('resolveAppEntry — invariants', () => {
  const cases = [
    {
      name: 'parent-home shared privileged',
      input: {
        parentSession: { authenticated: true, privilegeActive: true },
        parentPrivilegeActive: true,
        childSession: null,
        trustedDevice: td('shared'),
        allowedChildren: [{ id: A }, { id: B }],
      },
    },
    {
      name: 'child-home shared single',
      input: {
        parentSession: null,
        childSession: null,
        trustedDevice: td('shared'),
        allowedChildren: [{ id: A }],
      },
    },
    {
      name: 'picker multi shared',
      input: {
        parentSession: null,
        childSession: null,
        trustedDevice: td('shared'),
        allowedChildren: [{ id: A }, { id: B }],
      },
    },
    {
      name: 'revoked',
      input: {
        parentSession: { valid: true },
        trustedDevice: { valid: true, revoked: true, deviceMode: 'child' },
        allowedChildren: [{ id: A }],
      },
    },
  ];

  for (const c of cases) {
    it(`invariant bundle: ${c.name}`, () => {
      const r = resolveAppEntry(c.input);

      if (r.destination === DESTINATIONS.CHILD_HOME) {
        assert.equal(r.viewContext, 'child');
        assert.equal(r.credentialContext, 'child');
        assert.ok(r.childId, 'child home requires childId');
      }

      if (r.destination === DESTINATIONS.PARENT_HOME) {
        assert.equal(r.viewContext, 'parent');
        assert.equal(r.credentialContext, 'parent');
        const priv = c.input.parentPrivilegeActive === true
          || (c.input.parentSession && c.input.parentSession.privilegeActive === true);
        assert.ok(priv, 'parent home requires active parent privilege');
      }

      if (c.input.trustedDevice?.revoked === true) {
        assert.notEqual(r.destination, DESTINATIONS.PARENT_HOME);
        assert.notEqual(r.destination, DESTINATIONS.CHILD_HOME);
      }
    });
  }

  it('stale localDeviceModeHint does not change authoritative decision', () => {
    const base = {
      parentSession: null,
      childSession: null,
      trustedDevice: td('shared'),
      allowedChildren: [{ id: A }],
    };
    const without = resolveAppEntry(base);
    const withParentHint = resolveAppEntry({ ...base, localDeviceModeHint: 'parent' });
    const withChildHint = resolveAppEntry({ ...base, localDeviceModeHint: 'child' });
    assert.deepEqual(without, withParentHint);
    assert.deepEqual(without, withChildHint);
  });

  it('revoked device never yields authenticated child credential destination', () => {
    const r = resolveAppEntry({
      parentSession: null,
      childSession: { valid: true, childId: A },
      trustedDevice: { valid: true, revoked: true, deviceMode: 'child', defaultChildId: A },
      allowedChildren: [{ id: A }],
    });
    assert.notEqual(r.credentialContext, 'child');
    assert.notEqual(r.destination, DESTINATIONS.CHILD_HOME);
  });
});

describe('app entry orchestrator contract (Fas 1 + 2A)', () => {
  it('resolveAppEntry is exported from src/lib/app-entry-resolve.js', () => {
    assert.equal(typeof resolveAppEntry, 'function');
  });
});
