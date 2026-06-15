'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  isEmailAllowlisted,
  getAllowlist,
} = require('../src/lib/magic-view-access');

test('isEmailAllowlisted matches default preview allowlist', () => {
  const list = getAllowlist();
  assert.ok(list.includes('pontus@burman.cc'));
  assert.equal(isEmailAllowlisted('pontus@burman.cc'), true);
  assert.equal(isEmailAllowlisted('Pontus@Burman.CC'), true);
  assert.equal(isEmailAllowlisted('other@example.com'), false);
});

test('MAGIC_VIEW_ALLOWLIST env overrides defaults', () => {
  const prev = process.env.MAGIC_VIEW_ALLOWLIST;
  process.env.MAGIC_VIEW_ALLOWLIST = 'alpha@test.se,beta@test.se';
  try {
    delete require.cache[require.resolve('../src/lib/magic-view-access')];
    const mod = require('../src/lib/magic-view-access');
    assert.deepEqual(mod.getAllowlist(), ['alpha@test.se', 'beta@test.se']);
    assert.equal(mod.isEmailAllowlisted('alpha@test.se'), true);
    assert.equal(mod.isEmailAllowlisted('pontus@burman.cc'), false);
  } finally {
    if (prev === undefined) delete process.env.MAGIC_VIEW_ALLOWLIST;
    else process.env.MAGIC_VIEW_ALLOWLIST = prev;
    delete require.cache[require.resolve('../src/lib/magic-view-access')];
  }
});
