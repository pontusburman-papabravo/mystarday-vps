'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  checkAdultInviteEligibility,
  checkChildNameInFamily,
  VALID_FAMILY_ROLES,
} = require('../src/lib/family-duplicates');

test('VALID_FAMILY_ROLES includes mamma and pappa', () => {
  assert.ok(VALID_FAMILY_ROLES.includes('mamma'));
  assert.ok(VALID_FAMILY_ROLES.includes('pappa'));
});

test('checkAdultInviteEligibility rejects invalid email', async () => {
  const db = { query: async () => ({ rows: [] }) };
  const r = await checkAdultInviteEligibility(db, 'not-an-email', 'f1');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'INVALID_EMAIL');
});

test('checkChildNameInFamily rejects duplicate name', async () => {
  const db = {
    query: async () => ({ rows: [{ id: 'c1', name: 'Astrid' }] }),
  };
  const r = await checkChildNameInFamily(db, 'Astrid', 'f1');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'DUPLICATE_CHILD_NAME');
  assert.ok(r.suggestions && r.suggestions.length > 0);
});
