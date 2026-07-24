'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

describe('i18n child core', () => {
  it('resolveChildUiLocale gates en-GB behind english_child_experience', () => {
    const { resolveChildUiLocale } = require('../src/lib/child-ui-locale');
    assert.equal(resolveChildUiLocale('sv-SE', true), 'sv-SE');
    assert.equal(resolveChildUiLocale('en-GB', false), 'sv-SE');
    assert.equal(resolveChildUiLocale('en-GB', true), 'en-GB');
    assert.equal(resolveChildUiLocale(null, true), 'sv-SE');
  });

  it('child locale fragments merge into API bundles', () => {
    const i18n = require('../src/lib/i18n');
    i18n.loadLocales();
    assert.equal(i18n.t('sv-SE', 'child.login.whoAreYou'), 'Vem är du?');
    assert.equal(i18n.t('en-GB', 'child.login.whoAreYou'), 'Who are you?');
    assert.equal(i18n.t('en-GB', 'child.nav.treasureChest'), 'Treasure Chest');
    assert.match(i18n.t('sv-SE', 'child.celebration.milestone25'), /Bra jobbat/);
    assert.match(i18n.t('en-GB', 'child.celebration.milestone25'), /Great work/);
  });

  it('child-app-i18n exposes cpt and login error localization', () => {
    const i18nSrc = fs.readFileSync(path.join(ROOT, 'public/js/i18n.js'), 'utf8');
    const childI18nSrc = fs.readFileSync(path.join(ROOT, 'public/js/child-app-i18n.js'), 'utf8');
    const sandbox = { window: {}, document: { addEventListener: () => {} }, CustomEvent: function CustomEvent() {} };
    vm.runInNewContext(i18nSrc, sandbox, { filename: 'i18n.js' });
    vm.runInNewContext(childI18nSrc, sandbox, { filename: 'child-app-i18n.js' });
    assert.equal(typeof sandbox.window.cpt, 'function');
    assert.equal(typeof sandbox.window.childLoginErrorFromResponse, 'function');
    assert.equal(typeof sandbox.window.initChildAppI18n, 'function');
  });

  it('child-login route returns stable error codes', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/auth/child-login.js'), 'utf8');
    assert.match(src, /code: 'CHILD_NAME_REQUIRED'/);
    assert.match(src, /code: 'CHILD_PIN_LOCKED'/);
    assert.match(src, /code: 'CHILD_PIN_INVALID'/);
    assert.match(src, /code: 'CHILD_SERVER_ERROR'/);
  });

  it('child dashboard loads i18n bootstrap scripts', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(html, /child-app-i18n\.js/);
    assert.match(html, /\/js\/i18n\.js/);
  });

  it('child-login loads child-app-i18n bootstrap', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-login.html'), 'utf8');
    assert.match(html, /child-app-i18n\.js/);
  });

  it('child worlds nav uses cpt for aria-label', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    assert.match(src, /cpt\('nav\.ariaLabel'\)/);
  });

  it('child celebrations use localized milestone copy', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-celebrations.js'), 'utf8');
    assert.match(src, /cpt\('celebration\.milestone25'\)/);
    assert.match(src, /cpt\('celebration\.milestone50'\)/);
  });
});
