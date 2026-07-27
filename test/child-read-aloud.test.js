'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '../public/js/child-read-aloud.js');

describe('child-read-aloud.js', () => {
  it('does not hardcode utter.lang to sv-SE', () => {
    const src = fs.readFileSync(SRC, 'utf8');
    assert.doesNotMatch(src, /utter\.lang\s*=\s*'sv-SE'/);
    assert.match(src, /resolveReadAloudLang/);
    assert.match(src, /getChildUiLocale/);
  });

  it('resolveReadAloudLang follows child UI locale', () => {
    const src = fs.readFileSync(SRC, 'utf8');
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);

    sandbox.window.getChildUiLocale = () => 'en-GB';
    assert.equal(sandbox.window.ChildReadAloud.resolveReadAloudLang(), 'en-GB');

    sandbox.window.getChildUiLocale = () => 'sv-SE';
    assert.equal(sandbox.window.ChildReadAloud.resolveReadAloudLang(), 'sv-SE');

    delete sandbox.window.getChildUiLocale;
    assert.equal(sandbox.window.ChildReadAloud.resolveReadAloudLang(), 'sv-SE');
  });
});
