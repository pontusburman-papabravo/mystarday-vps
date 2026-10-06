'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function load(rel, sandbox) {
  vm.createContext(sandbox);
  vm.runInContext(read(rel), sandbox, { filename: rel });
  return sandbox;
}

const PUBLIC = [
  { id: 'sv-SE', base: 'sv', aliases: ['sv', 'sv-SE'] },
  { id: 'en-GB', base: 'en', aliases: ['en', 'en-GB'] },
  { id: 'fr-FR', base: 'fr', aliases: ['fr', 'fr-FR'] },
  { id: 'pl-PL', base: 'pl', aliases: ['pl', 'pl-PL'] },
  { id: 'de-DE', base: 'de', aliases: ['de', 'de-DE'] },
];

function memoryStorage(initial) {
  const data = Object.assign({}, initial);
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
    removeItem(key) { delete data[key]; },
  };
}

describe('child timer accessibility follows plural resources', () => {
  it('does not append a Swedish suffix outside English', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.doesNotMatch(src, /\?'er'/);
    assert.doesNotMatch(src, /locale === 'en-GB'/);
    assert.match(src, /pluralWord\('activityTimer\.minuteUnit'/);
  });

  it('uses Polish few and many, and a synthetic locale gets no Swedish suffix', () => {
    const rules = new Intl.PluralRules('pl-PL');
    const minutes = { one: 'minuta', few: 'minuty', many: 'minut', other: 'minuty' };
    const seconds = { one: 'sekunda', few: 'sekundy', many: 'sekund', other: 'sekundy' };
    const sandbox = {
      document: { addEventListener() {} },
      childPlural(base, count) {
        const table = String(base).indexOf('second') >= 0 ? seconds : minutes;
        return table[rules.select(count)];
      },
      childT(key, params) {
        if (key !== 'activityTimer.ariaMinutesAndSeconds') return key;
        return 'Minutnik. ' + params.minutes + ' ' + params.minuteWord
          + ' i ' + params.seconds + ' ' + params.secondWord + ' zostało.';
      },
    };
    sandbox.window = sandbox;
    load('public/js/child-dashboard-activity-timer.js', sandbox);
    const label = sandbox.ChildActivityTimer.ariaRemainingLabel;
    assert.equal(label(62), 'Minutnik. 1 minuta i 2 sekundy zostało.');
    assert.equal(label(125), 'Minutnik. 2 minuty i 5 sekund zostało.');
    assert.equal(label(22 * 60 + 22), 'Minutnik. 22 minuty i 22 sekundy zostało.');

    sandbox.childPlural = function () { return ''; };
    sandbox.childT = function (key, params) {
      if (key !== 'activityTimer.ariaMinutesAndSeconds') return key;
      return 'Timer. ' + params.minutes + ' ' + params.minuteWord
        + ' and ' + params.seconds + ' ' + params.secondWord + ' left.';
    };
    assert.equal(label(125), 'Timer. 2  and 5  left.');
    assert.doesNotMatch(label(125), /minuter|sekunder|\ber\b/);
  });
});

describe('login locale fallback is catalog-driven', () => {
  it('source has no Swedish/English pair', () => {
    const src = read('public/js/login-locale.js');
    assert.doesNotMatch(src, /sv-SE/);
    assert.doesNotMatch(src, /en-GB/);
    assert.match(src, /normalizeAgainstCatalog/);
  });

  it('keeps fr-FR and pl-PL when the I18n object is missing', async () => {
    const storage = memoryStorage({});
    let catalog = null;
    const sandbox = {
      window: {},
      sessionStorage: storage,
      localStorage: storage,
      fetch() {
        return Promise.resolve({
          ok: true,
          json: async () => ({ locales: catalog || PUBLIC }),
        });
      },
    };
    sandbox.window.sessionStorage = storage;
    sandbox.window.localStorage = storage;
    load('public/js/login-locale.js', sandbox);

    storage.setItem('sd_locale_explicit_choice', '1');
    storage.setItem('sd_preferred_locale', 'fr-FR');
    assert.equal(sandbox.window.LoginLocale.getPreAuthLocaleChoice(), null);

    catalog = PUBLIC;
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(sandbox.window.LoginLocale.getPreAuthLocaleChoice(), 'fr-FR');
    assert.equal(
      sandbox.window.LoginLocale.withLoginLocale({ email: 'a@example.com' }).preferred_locale,
      'fr-FR'
    );

    storage.setItem('sd_preferred_locale', 'pl');
    assert.equal(sandbox.window.LoginLocale.normalizeLocale('pl'), 'pl-PL');
    assert.equal(sandbox.window.LoginLocale.getPreAuthLocaleChoice(), 'pl-PL');
    assert.equal(sandbox.window.LoginLocale.normalizeLocale('xx-YY'), null);
  });

  it('prefers I18n._normalize and still resolves a public locale from the embedded catalog', () => {
    const storage = memoryStorage({
      sd_locale_explicit_choice: '1',
      sd_preferred_locale: 'de',
    });
    const sandbox = {
      window: {
        I18n: {
          CATALOG: { locales: PUBLIC },
          _normalize(raw) { return raw === 'de' ? 'de-DE' : null; },
        },
      },
      sessionStorage: storage,
      localStorage: storage,
      fetch() { throw new Error('catalog fetch should not run when I18n.CATALOG exists'); },
    };
    sandbox.window.sessionStorage = storage;
    sandbox.window.localStorage = storage;
    sandbox.I18n = sandbox.window.I18n;
    load('public/js/login-locale.js', sandbox);
    assert.equal(sandbox.window.LoginLocale.getPreAuthLocaleChoice(), 'de-DE');

    delete sandbox.window.I18n._normalize;
    assert.equal(sandbox.window.LoginLocale.normalizeLocale('fr'), 'fr-FR');
  });
});

describe('native family locale uses the catalog', () => {
  it('does not reset a public locale to Swedish', async () => {
    const inits = [];
    const sandbox = {
      window: {
        I18n: {
          CATALOG: { locales: PUBLIC },
          DEFAULT_LOCALE: 'sv-SE',
          init(locale) { inits.push(locale); return Promise.resolve(); },
        },
      },
      document: { dispatchEvent() {} },
      navigator: { languages: ['fr-FR'], language: 'fr-FR' },
      CustomEvent: function CustomEvent(name, init) {
        this.type = name;
        this.detail = init && init.detail;
      },
    };
    sandbox.I18n = sandbox.window.I18n;
    load('public/js/native-locale-contract.js', sandbox);
    assert.equal(await sandbox.window.NativeLocaleContract.applyFamilyLocale('fr-FR'), 'fr-FR');
    assert.deepEqual(inits, ['fr-FR']);
    assert.equal(sandbox.window.NativeLocaleContract.normalizeLocale('pl'), 'pl-PL');

    sandbox.window.I18n = null;
    assert.equal(await sandbox.window.NativeLocaleContract.applyFamilyLocale('fr-FR'), null);
  });
});

describe('english_app_enabled stays a legacy gate for en-GB only', () => {
  it('allows another public locale when the English flag is off', () => {
    const sandbox = {
      window: {},
      document: {
        addEventListener() {},
        querySelectorAll() { return []; },
        body: { dataset: {} },
      },
    };
    load('public/js/locale-switcher.js', sandbox);
    const allow = sandbox.window.LocaleSwitcher.localeChangeAllowed;
    assert.equal(allow({ id: 'fr-FR', selectRequiresFeature: null }, false), true);
    assert.equal(allow({ id: 'pl-PL' }, false), true);
    assert.equal(allow({ id: 'en-GB', selectRequiresFeature: 'english_app' }, false), false);
    assert.equal(allow({ id: 'en-GB', selectRequiresFeature: 'english_app' }, true), true);
  });
});

describe('product chrome no longer assumes Swedish versus English', () => {
  it('cookie banner keeps public-web English and a catalog path', () => {
    const src = read('public/js/cookie-banner.js');
    assert.match(src, /catalogCookieCopy/);
    assert.match(src, /Reject all/);
    assert.match(src, /Accept all/);
    assert.match(src, /isEnglishPublicPath/);
  });

  it('removed bilingual branches from product scripts', () => {
    assert.doesNotMatch(read('public/js/growth-system-help.js'), /function isEnglish\(/);
    assert.doesNotMatch(read('public/js/growth-feedback.js'), /indexOf\('en'\)/);
    assert.doesNotMatch(read('public/js/growth-referral-cta.js'), /function isEn\(/);
    assert.doesNotMatch(read('public/js/profile-switch-chrome.js'), /isEnglishChrome/);
    assert.doesNotMatch(read('public/js/child-profile-picker.js'), /indexOf\('en'\)/);
    assert.doesNotMatch(read('public/js/support-bubble.js'), /'en' : 'sv'/);
    assert.doesNotMatch(read('public/js/legal-return-nav.js'), /indexOf\('en'\)/);
    assert.doesNotMatch(read('public/js/settings-subscription.js'), /indexOf\('en'\)/);
    assert.doesNotMatch(read('public/js/dashboard.js'), /aktivitet\$\{/);
    assert.match(read('public/js/growth-referral-cta.js'), /growthReferral\./);
    assert.match(read('public/js/legal-return-nav.js'), /legalReturn\.backToPremium/);
  });

  it('profile chrome falls back to English for a non-default locale', () => {
    const storage = memoryStorage({ sd_preferred_locale: 'fr-FR' });
    const sandbox = {
      window: { I18n: { getCurrentLang() { return 'fr-FR'; }, DEFAULT_LOCALE: 'sv-SE' } },
      document: {
        documentElement: { lang: 'fr-FR', getAttribute() { return null; } },
        readyState: 'complete',
        addEventListener() {},
        querySelector() { return null; },
        getElementById() { return null; },
        createElement() {
          return {
            type: '', className: '', innerHTML: '', style: {},
            setAttribute() {}, addEventListener() {},
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
    load('public/js/profile-switch-chrome.js', sandbox);
    assert.equal(sandbox.window.ProfileSwitchChrome.labelText(), 'Switch profile');
    assert.equal(sandbox.window.ProfileSwitchChrome.returnToChildLabel(), 'Back to child');
  });
});
