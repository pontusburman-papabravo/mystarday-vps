'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../src/lib/adult-privilege-lease-policy');
const { isEscalatedParentExpired, signParentAccessWithOptionalLease } = require('../src/lib/adult-privilege-escalation');

test('lease policy by device_mode', () => {
  assert.equal(policy.leaseApplies('parent'), false);
  assert.equal(policy.leaseApplies('shared'), true);
  assert.equal(policy.leaseApplies('child'), true);
  assert.equal(policy.backgroundGraceMs('parent'), policy.PARENT_DEVICE_BACKGROUND_GRACE_MS);
  assert.ok(policy.backgroundGraceMs('shared') > 0);
});

test('escalated parent JWT expires when lease passed', () => {
  const parentRow = { id: 'p1', family_id: 'f1', email: 'a@example.com', is_admin: false };
  const signed = signParentAccessWithOptionalLease(parentRow, { deviceMode: 'shared' });
  assert.ok(signed.privilegeLeaseUntil);
  const decoded = {
    type: 'parent',
    privilegeEscalation: true,
    privilegeLeaseUntil: Date.now() - 1000,
  };
  assert.equal(isEscalatedParentExpired(decoded), true);
});

test('parent device token without escalation never lease-expires', () => {
  const parentRow = { id: 'p1', family_id: 'f1', email: null, is_admin: false };
  const signed = signParentAccessWithOptionalLease(parentRow, { deviceMode: 'parent' });
  assert.equal(signed.privilegeLeaseUntil, null);
});
