'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('login-locale client helper', () => {
  test('login.html loads helper before auth handlers', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/login.html'), 'utf8');
    assert.match(html, /login-locale\.js/);
    assert.match(html, /LoginLocale\.withLoginLocale/);
  });

  test('helper reads sessionStorage and merges into login body', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/login-locale.js'), 'utf8');
    assert.match(src, /sd_preferred_locale/);
    assert.match(src, /withLoginLocale/);
    assert.match(src, /preferred_locale/);
  });
});

describe('apply-login-locale server helper', () => {
  test('exports applyLoginLocaleChoice with login selection source', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/apply-login-locale.js'), 'utf8');
    assert.match(src, /SELECTION_SOURCES\.LOGIN/);
    const { SELECTION_SOURCES } = require('../src/lib/locale-selection');
    assert.equal(SELECTION_SOURCES.LOGIN, 'login');
  });
});
