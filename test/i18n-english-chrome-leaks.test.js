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
    assert.match(src, /initSharedDevicePickerI18n/);
    assert.match(src, /body\.preferredLocale/);
    assert.match(src, /nav\.adult/);
    assert.match(src, /profilePicker\.loginAsAdultEmail/);
    assert.doesNotMatch(src, /parent\.name \|\| 'Vuxen'/);
    assert.doesNotMatch(src, /cpp-profile-hint">Vuxen/);
  });

  it('profile picker HTML follows family locale bootstrap, not child UI', () => {
    const html = read('public/child-profile-picker.html');
    assert.doesNotMatch(html, /initChildAppI18n/);
    assert.match(html, /child-app-i18n\.js/);
    assert.match(html, /data-i18n="child\.profilePicker\.loginAsAdultEmail"/);
  });

  it('shared picker i18n does not persist child UI locale or gate on english_child_experience', () => {
    const src = read('public/js/child-app-i18n.js');
    const start = src.indexOf('async function initSharedDevicePickerI18n');
    const end = src.indexOf('function applyPageTitle');
    assert.ok(start > -1 && end > start);
    const body = src.slice(start, end);
    assert.doesNotMatch(body, /persistChildUiLocaleHandoff/);
    assert.doesNotMatch(body, /resolveChildUiLocale/);
    assert.doesNotMatch(body, /child_ui_locale/);
    assert.match(body, /preferred_locale/);
  });

  it('app-entry exposes family preferredLocale for the shared picker', () => {
    const src = read('src/routes/auth/app-entry.js');
    assert.match(src, /getFamilyPreferredLocale/);
    assert.match(src, /preferredLocale/);
  });

  it('home last\/next and hub status use localized activity display_name', () => {
    const cards = read('public/js/dashboard-cards.js');
    const hub = read('public/js/dashboard-home-hub.js');
    assert.match(cards, /lastDone\.display_name \|\| lastDone\.name/);
    assert.match(cards, /nextPending\.display_name \|\| nextPending\.name/);
    assert.match(hub, /next\.display_name \|\| next\.name/);
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
    assert.equal(t('sv-SE', 'child.profilePicker.who'), 'Vem använder appen?');
    assert.equal(t('en-GB', 'child.profilePicker.who'), 'Who is using the app?');
    assert.equal(t('sv-SE', 'child.profilePicker.tap'), 'Tryck på din profil');
    assert.equal(t('en-GB', 'child.profilePicker.tap'), 'Tap your profile');
    assert.equal(t('en-GB', 'child.nav.adult'), 'Grown-up');
    assert.equal(t('sv-SE', 'child.nav.adult'), 'Vuxen');
    assert.equal(
      t('en-GB', 'child.profilePicker.loginAsAdultEmail'),
      'Log in as a grown-up with email or Apple/Google'
    );
    assert.doesNotMatch(t('en-GB', 'child.profilePicker.loginAsAdultEmail'), /[åäöÅÄÖ]/);
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

  it('shared picker init uses family en-GB without writing sd_child_ui_locale', async () => {
    const storage = {
      _m: { sd_preferred_locale: 'en-GB' },
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(this._m, key) ? this._m[key] : null;
      },
      setItem(key, val) { this._m[key] = String(val); },
      removeItem(key) { delete this._m[key]; },
    };
    const inits = [];
    const sandbox = {
      window: {},
      document: {
        body: { dataset: {} },
        addEventListener() {},
        dispatchEvent() {},
      },
      CustomEvent: function CustomEvent(name, init) {
        this.type = name;
        this.detail = init && init.detail;
      },
      sessionStorage: storage,
      localStorage: storage,
      console,
    };
    sandbox.window.document = sandbox.document;
    sandbox.window.sessionStorage = storage;
    sandbox.window.localStorage = storage;
    const i18nApi = {
      STORAGE_KEY: 'sd_preferred_locale',
      lang: 'sv-SE',
      _normalize(raw) {
        if (!raw) return null;
        const s = String(raw).trim();
        if (s === 'en-GB' || s === 'sv-SE') return s;
        return null;
      },
      async init(lang) { inits.push(lang); this.lang = lang; },
      apply() {},
      t(key) { return key; },
    };
    sandbox.window.I18n = i18nApi;
    sandbox.I18n = i18nApi;
    vm.runInNewContext(read('public/js/child-app-i18n.js'), sandbox);
    const lang = await sandbox.window.initSharedDevicePickerI18n();
    assert.equal(lang, 'en-GB');
    assert.deepEqual(inits, ['en-GB']);
    assert.equal(storage.getItem('sd_child_ui_locale'), null);
    assert.equal(storage.getItem('sd_english_child_experience'), null);
    assert.equal(storage.getItem('sd_preferred_locale'), 'en-GB');
  });
});
