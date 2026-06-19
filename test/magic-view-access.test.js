'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

function loadModule(env = {}) {
  const keys = [
    'MAGIC_VIEW_ALLOWLIST',
    'MAGIC_VIEW_PREVIEW_ONLY',
    'MAGIC_VIEW_DISABLED',
  ];
  const prev = {};
  for (const k of keys) {
    prev[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  delete require.cache[require.resolve('../src/lib/magic-view-access')];
  const mod = require('../src/lib/magic-view-access');
  return {
    mod,
    restore() {
      for (const k of keys) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
      delete require.cache[require.resolve('../src/lib/magic-view-access')];
    },
  };
}

test('default mode enables magic for all emails', () => {
  const { mod, restore } = loadModule();
  try {
    assert.equal(mod.isEmailAllowlisted('anyone@example.com'), true);
    assert.equal(mod.isEmailAllowlisted('pontus@burman.cc'), true);
  } finally {
    restore();
  }
});

test('MAGIC_VIEW_DISABLED kills access', () => {
  const { mod, restore } = loadModule({ MAGIC_VIEW_DISABLED: 'true' });
  try {
    assert.equal(mod.isEmailAllowlisted('pontus@burman.cc'), false);
  } finally {
    restore();
  }
});

test('preview mode restricts to allowlist', () => {
  const { mod, restore } = loadModule({
    MAGIC_VIEW_PREVIEW_ONLY: 'true',
    MAGIC_VIEW_ALLOWLIST: 'alpha@test.se,beta@test.se',
  });
  try {
    assert.deepEqual(mod.getAllowlist(), ['alpha@test.se', 'beta@test.se']);
    assert.equal(mod.isEmailAllowlisted('alpha@test.se'), true);
    assert.equal(mod.isEmailAllowlisted('Pontus@Burman.CC'), false);
    assert.equal(mod.isEmailAllowlisted('other@example.com'), false);
  } finally {
    restore();
  }
});
