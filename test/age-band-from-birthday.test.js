'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

describe('age-band-from-birthday', () => {
  function loadFn() {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/age-band-from-birthday.js'), 'utf8');
    const sandbox = { window: {} };
    vm.runInNewContext(src, sandbox);
    return sandbox.window.ageBandFromBirthday;
  }

  it('maps toddler birthday to 3-5', () => {
    const fn = loadFn();
    const birthday = new Date();
    birthday.setFullYear(birthday.getFullYear() - 4);
    const iso = birthday.toISOString().slice(0, 10);
    assert.equal(fn(iso), '3-5');
  });

  it('maps school-age birthday to 9-12', () => {
    const fn = loadFn();
    const birthday = new Date();
    birthday.setFullYear(birthday.getFullYear() - 10);
    const iso = birthday.toISOString().slice(0, 10);
    assert.equal(fn(iso), '9-12');
  });

  it('defaults invalid input to 6-8', () => {
    const fn = loadFn();
    assert.equal(fn(''), '6-8');
    assert.equal(fn('not-a-date'), '6-8');
  });
});
