'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync(require.resolve('../public/js/parent-magic-auto.js'), 'utf8');
const context = {
  window: {
    location: { pathname: '/' },
    addEventListener: () => {},
    ParentMagicAuto: null,
  },
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ setAttribute: () => {}, classList: { add: () => {} } }),
  },
};
vm.runInNewContext(src, context);

describe('ParentMagicAuto', () => {
  it('resolves live parent paths', () => {
    const auto = context.window.ParentMagicAuto;
    assert.equal(auto.resolvePage('/calendar'), 'calendar');
    assert.equal(auto.resolvePage('/activities'), 'activities');
    assert.equal(auto.resolvePage('/child-settings'), 'child-settings');
    assert.equal(auto.resolvePage('/login'), null);
  });
});
