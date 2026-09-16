'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const PARENT_GATE_KEYS = [
  'parentGate.title',
  'parentGate.hint',
  'parentGate.keypadAria',
  'parentGate.cancel',
  'parentGate.forgotPinBackup',
  'parentGate.digitsEntered',
  'parentGate.backspace',
  'parentGate.confirm',
  'parentGate.needFourDigits',
];

describe('adult PIN-gate i18n', () => {
  it('login-magic overlay uses auth.parentGate keys, not hardcoded Swedish', () => {
    const src = read('public/js/login-magic.js');
    assert.match(src, /pgT\('parentGate\.title'\)/);
    assert.match(src, /pgT\('parentGate\.cancel'\)/);
    assert.match(src, /pgT\('errors\.parentPinInvalid'\)/);
    assert.match(src, /pgT\('errors\.serverError'\)/);
    assert.doesNotMatch(src, /Föräldralås/);
    assert.doesNotMatch(src, /Avbryt/);
    assert.doesNotMatch(src, /Felaktig PIN-kod/);
    assert.doesNotMatch(src, /Något gick fel — försök igen/);
  });

  it('adult-pin-gate-ui.js has no Swedish tx fallbacks', () => {
    const src = read('public/js/adult-pin-gate-ui.js');
    assert.match(src, /auth\.' \+ key/);
    assert.match(src, /childT\(key/);
    assert.match(src, /parentGate\.title/);
    assert.match(src, /parentGate\.cancel/);
    assert.match(src, /parentGate\.forgotPinBackup/);
    assert.doesNotMatch(src, /tx\([^)]+,\s*'[^']*[åäöÅÄÖ]/);
    assert.doesNotMatch(src, /tx\([^)]+,\s*'Avbryt'/);
    assert.doesNotMatch(src, /Vuxenläge/);
    assert.doesNotMatch(src, /Ange din vuxen-PIN/);
  });

  it('auth and child parentGate keys exist in sv-SE and en-GB', () => {
    loadLocales();
    for (const key of PARENT_GATE_KEYS) {
      const authSv = t('sv-SE', 'auth.' + key);
      const authEn = t('en-GB', 'auth.' + key);
      const childSv = t('sv-SE', 'child.' + key);
      const childEn = t('en-GB', 'child.' + key);
      assert.notEqual(authSv, 'auth.' + key, `sv missing auth.${key}`);
      assert.notEqual(authEn, 'auth.' + key, `en missing auth.${key}`);
      assert.notEqual(childSv, 'child.' + key, `sv missing child.${key}`);
      assert.notEqual(childEn, 'child.' + key, `en missing child.${key}`);
      assert.doesNotMatch(authEn, /[åäöÅÄÖ]/);
      assert.doesNotMatch(childEn, /[åäöÅÄÖ]/);
    }
    assert.match(t('sv-SE', 'auth.parentGate.title'), /Föräldralås/);
    assert.match(t('en-GB', 'auth.parentGate.title'), /Parent lock/i);
    assert.match(t('sv-SE', 'auth.errors.parentPinInvalid'), /Felaktig PIN/);
    assert.match(t('en-GB', 'auth.errors.parentPinInvalid'), /Wrong PIN/i);
  });
});
