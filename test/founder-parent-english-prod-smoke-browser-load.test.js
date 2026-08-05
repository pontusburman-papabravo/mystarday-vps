'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('founder parent english prod smoke browser module', () => {
  it('loads without throwing (exports contract)', () => {
    const mod = require('../scripts/ops/founder-parent-english-prod-smoke-browser.cjs');
    assert.equal(typeof mod.runBrowserSmoke, 'function');
    assert.equal(typeof mod.enterChildPin, 'function');
    assert.equal(typeof mod.selectExpectedChild, 'function');
    assert.equal(typeof mod.evaluateChildTodaySessionPass, 'function');
    const child = require('../scripts/ops/founder-smoke-browser-child.cjs');
    assert.strictEqual(mod.evaluateChildTodaySessionPass, child.evaluateChildTodaySessionPass);
  });
});
