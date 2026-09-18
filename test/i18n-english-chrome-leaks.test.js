'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('English chrome leftover Swedish leaks', () => {
  it('profile-switch-chrome prefers parent nav.switchUser and locale-aware fallback', () => {
    const src = read('public/js/profile-switch-chrome.js');
    assert.match(src, /nav\.switchUser/);
    assert.match(src, /Switch profile/);
    assert.match(src, /parent-i18n-ready/);
    assert.match(src, /locale-changed/);
    assert.doesNotMatch(src, /function labelText\(\) \{[\s\S]*return 'Byt profil';\s*\}/);
  });

  it('parent magic settings switch card does not hardcode Byt profil as the only fallback', () => {
    const src = read('public/js/parent-magic-page-hubs.js');
    assert.match(src, /nav\.switchUser/);
    assert.doesNotMatch(src, /labelText\(\) : 'Byt profil'/);
  });

  it('profile picker headings use locale keys instead of hardcoded Swedish', () => {
    const src = read('public/js/child-profile-picker.js');
    assert.match(src, /settings\.switchProfile/);
    assert.match(src, /profilePicker\.who/);
    assert.match(src, /profilePicker\.tap/);
    assert.match(src, /applyPickerHeadings/);
    assert.doesNotMatch(src, /title\.textContent = isSwitch \? 'Byt profil'/);
  });

  it('home cards render localized activity display_name', () => {
    const src = read('public/js/dashboard-cards.js');
    assert.match(src, /item\.display_name \|\| item\.name/);
    assert.doesNotMatch(src, /escHtml\(item\.name\)<\/span>` : `<span>\$\{escHtml\(item\.name\)\}/);
  });

  it('nav and child returnToChild keys exist in both locales', () => {
    loadLocales();
    assert.equal(t('sv-SE', 'nav.returnToChild'), 'Tillbaka till barn');
    assert.equal(t('en-GB', 'nav.returnToChild'), 'Back to child');
    assert.equal(t('sv-SE', 'nav.switchUser'), 'Byt profil');
    assert.equal(t('en-GB', 'nav.switchUser'), 'Switch profile');
    assert.equal(t('sv-SE', 'child.settings.returnToChild'), 'Tillbaka till barn');
    assert.equal(t('en-GB', 'child.settings.returnToChild'), 'Back to child');
    assert.doesNotMatch(t('en-GB', 'nav.switchUser'), /[åäöÅÄÖ]/);
    assert.doesNotMatch(t('en-GB', 'child.settings.switchProfile'), /[åäöÅÄÖ]/);
  });

  it('English fallback wins on parent pages before I18n.init when locale is en-GB', () => {
    const src = read('public/js/profile-switch-chrome.js');
    const storage = {
      getItem(key) {
        if (key === 'sd_preferred_locale') return 'en-GB';
        return null;
      },
      setItem() {},
    };
    const sandbox = {
      window: {
        I18n: { getCurrentLang() { return 'en-GB'; } },
      },
      document: {
        documentElement: { lang: 'en-GB', getAttribute() { return null; } },
        readyState: 'complete',
        addEventListener() {},
        querySelector() { return null; },
        getElementById() { return null; },
        createElement() {
          return {
            type: '',
            className: '',
            innerHTML: '',
            style: {},
            setAttribute() {},
            addEventListener() {},
          };
        },
      },
      sessionStorage: storage,
      localStorage: storage,
      console,
    };
    sandbox.window.document = sandbox.document;
    sandbox.window.sessionStorage = storage;
    sandbox.window.localStorage = storage;
    vm.runInNewContext(src, sandbox);
    assert.equal(sandbox.window.ProfileSwitchChrome.labelText(), 'Switch profile');
    assert.equal(sandbox.window.ProfileSwitchChrome.returnToChildLabel(), 'Back to child');
  });
});
