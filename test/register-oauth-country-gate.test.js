'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function memStorage() {
  const store = Object.create(null);
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  };
}

function loadRegistrationModules(opts) {
  opts = opts || {};
  const sessionStorage = opts.sessionStorage || memStorage();
  const errorEl = { textContent: '', hidden: true };
  const document = {
    querySelector(sel) {
      if (sel === '[data-country-choice-error]') return errorEl;
      if (sel === '[data-country-choice-mount]') return { scrollIntoView() { document._scrolled = true; } };
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    getElementById() { return null; },
    head: { appendChild() {} },
    createElement() { return { textContent: '', id: '' }; },
    _scrolled: false,
  };
  const window = {
    sessionStorage,
    document,
    I18n: { t(key) { return key; } },
    MarketCountries: { REGISTRATION_COUNTRIES: [] },
    analytics: { track() {} },
  };
  const context = {
    window,
    document,
    sessionStorage,
    console,
    fetch: async () => { throw new Error('no fetch'); },
  };
  context.global = window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/js/country-choice.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/js/registration-country-gate.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/js/register-apple-auth.js'), 'utf8'), context);
  return {
    window: context.window,
    CountryChoice: context.window.CountryChoice,
    RegistrationCountryGate: context.window.RegistrationCountryGate,
    RegisterAppleAuth: context.window.RegisterAppleAuth,
    errorEl,
    document,
    sessionStorage,
  };
}

function confirmCountry(sessionStorage, code) {
  sessionStorage.setItem('sd_country_confirmed', '1');
  sessionStorage.setItem('sd_country_code', code);
}

describe('CountryChoice public registration gate', () => {
  it('default market gates remain fail-closed except SE', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/country-choice.js'), 'utf8');
    assert.match(src, /SE:\s*true/);
    assert.match(src, /IE:\s*false/);
    assert.match(src, /FI:\s*false/);
    assert.match(src, /UK:\s*false/);
    assert.match(src, /US:\s*false/);
    assert.match(src, /OTHER:\s*false/);
  });

  it('exports requireSelection as a function that never throws', () => {
    const { CountryChoice } = loadRegistrationModules();
    assert.equal(typeof CountryChoice.requireSelection, 'function');
    assert.equal(typeof CountryChoice.isConfirmed, 'function');
    assert.equal(typeof CountryChoice.getCountryCode, 'function');
    assert.doesNotThrow(() => CountryChoice.requireSelection());
    assert.equal(CountryChoice.requireSelection(), false);
  });

  it('missing country is fail-closed and shows the mounted error', () => {
    const { CountryChoice, errorEl } = loadRegistrationModules();
    assert.equal(CountryChoice.isConfirmed(), false);
    assert.equal(CountryChoice.requireSelection(), false);
    assert.equal(errorEl.hidden, false);
    assert.ok(errorEl.textContent);
  });

  it('confirmed open country (SE, default gate) allows registration', () => {
    const sessionStorage = memStorage();
    confirmCountry(sessionStorage, 'SE');
    const { CountryChoice, errorEl } = loadRegistrationModules({ sessionStorage });
    assert.equal(CountryChoice.isConfirmed(), true);
    assert.equal(CountryChoice.requireSelection(), true);
    assert.equal(errorEl.hidden, true);
  });

  it('confirmed closed country is fail-closed (isConfirmed alone is not enough)', () => {
    const sessionStorage = memStorage();
    confirmCountry(sessionStorage, 'IE');
    const { CountryChoice } = loadRegistrationModules({ sessionStorage });
    assert.equal(CountryChoice.isConfirmed(), true, 'session still looks confirmed');
    assert.equal(CountryChoice.requireSelection(), false, 'IE is closed by default gates');
  });

  it('RegistrationCountryGate.allow never throws when requireSelection is missing', () => {
    const { RegistrationCountryGate } = loadRegistrationModules();
    assert.doesNotThrow(() => RegistrationCountryGate.allow(undefined));
    assert.doesNotThrow(() => RegistrationCountryGate.allow({}));
    assert.equal(RegistrationCountryGate.allow({ requireSelection: 'not-a-function' }), false);
    assert.equal(RegistrationCountryGate.allow({
      requireSelection() { throw new Error('boom'); },
    }), false);
  });
});

describe('RegistrationCountryGate.allow is fail-closed', () => {
  function loadGateOnly() {
    const window = { document: { querySelector() { return null; } } };
    const context = { window, document: window.document };
    context.global = window;
    vm.createContext(context);
    vm.runInContext(
      fs.readFileSync(path.join(ROOT, 'public/js/registration-country-gate.js'), 'utf8'),
      context
    );
    return context.window.RegistrationCountryGate;
  }

  it('allow(null) === false', () => {
    assert.equal(loadGateOnly().allow(null), false);
  });

  it('allow(undefined) === false', () => {
    assert.equal(loadGateOnly().allow(undefined), false);
  });

  it('object without requireSelection → false', () => {
    assert.equal(loadGateOnly().allow({}), false);
  });

  it('throwing requireSelection → false', () => {
    assert.equal(loadGateOnly().allow({
      requireSelection() { throw new Error('boom'); },
    }), false);
  });

  it('requireSelection() === false → false', () => {
    assert.equal(loadGateOnly().allow({ requireSelection: () => false }), false);
  });

  it('requireSelection() === true → true', () => {
    assert.equal(loadGateOnly().allow({ requireSelection: () => true }), true);
  });
});

describe('Apple register preflight — signIn is not called when denied', () => {
  it('missing country => visible country reason, signIn call count 0', async () => {
    const { RegisterAppleAuth, CountryChoice } = loadRegistrationModules();
    let signInCalls = 0;
    const Platform = {
      isIOS: () => true,
      appleSignIn: {
        isAvailable: () => true,
        signIn: async () => { signInCalls += 1; return { idToken: 'tok' }; },
      },
    };
    const pre = RegisterAppleAuth.preflight(Platform, CountryChoice);
    assert.equal(pre.ok, false);
    assert.equal(pre.reason, 'country');
    if (pre.ok) await Platform.appleSignIn.signIn();
    assert.equal(signInCalls, 0);
  });

  it('confirmed open country => preflight ok so signIn is reachable', async () => {
    const sessionStorage = memStorage();
    confirmCountry(sessionStorage, 'SE');
    const { RegisterAppleAuth, CountryChoice } = loadRegistrationModules({ sessionStorage });
    let signInCalls = 0;
    const Platform = {
      isIOS: () => true,
      appleSignIn: {
        isAvailable: () => true,
        signIn: async () => { signInCalls += 1; return { idToken: 'tok' }; },
      },
    };
    const pre = RegisterAppleAuth.preflight(Platform, CountryChoice);
    assert.equal(pre.ok, true);
    if (pre.ok) await Platform.appleSignIn.signIn();
    assert.equal(signInCalls, 1);
  });

  it('iOS plugin unavailable => notEnabled, signIn call count 0', async () => {
    const sessionStorage = memStorage();
    confirmCountry(sessionStorage, 'SE');
    const { RegisterAppleAuth, CountryChoice } = loadRegistrationModules({ sessionStorage });
    let signInCalls = 0;
    const Platform = {
      isIOS: () => true,
      appleSignIn: {
        isAvailable: () => false,
        signIn: async () => { signInCalls += 1; return { idToken: 'tok' }; },
      },
    };
    const pre = RegisterAppleAuth.preflight(Platform, CountryChoice);
    assert.equal(pre.ok, false);
    assert.equal(pre.reason, 'notEnabled');
    if (pre.ok) await Platform.appleSignIn.signIn();
    assert.equal(signInCalls, 0);
  });

  it('preflight never throws when Platform is missing', () => {
    const { RegisterAppleAuth, CountryChoice } = loadRegistrationModules();
    let pre;
    assert.doesNotThrow(() => {
      pre = RegisterAppleAuth.preflight(undefined, CountryChoice);
    });
    assert.equal(pre.ok, false);
    assert.equal(pre.reason, 'unavailable');
  });

  it('missing CountryChoice module denies Apple register (fail-closed)', () => {
    const { RegisterAppleAuth } = loadRegistrationModules();
    let signInCalls = 0;
    const Platform = {
      isIOS: () => true,
      appleSignIn: {
        isAvailable: () => true,
        signIn: async () => { signInCalls += 1; return { idToken: 'tok' }; },
      },
    };
    const pre = RegisterAppleAuth.preflight(Platform, null);
    assert.equal(pre.ok, false);
    assert.equal(pre.reason, 'country');
    assert.equal(signInCalls, 0);
  });
});

describe('Google register uses the same fail-closed gate', () => {
  it('google-auth-ui no longer calls CountryChoice.requireSelection() unsafely', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/google-auth-ui.js'), 'utf8');
    assert.match(src, /RegistrationCountryGate\.allow/);
    assert.doesNotMatch(src, /!CountryChoice\.requireSelection\(\)/);
    assert.match(src, /pageKind\(\) === 'register'/);
  });

  it('missing country => Google signIn is not started', () => {
    const { RegistrationCountryGate, CountryChoice } = loadRegistrationModules();
    let signInCalls = 0;
    const countryOk = RegistrationCountryGate.allow(CountryChoice) === true;
    if (countryOk) signInCalls += 1;
    assert.equal(countryOk, false);
    assert.equal(signInCalls, 0);
  });

  it('confirmed open country => Google signIn may start', () => {
    const sessionStorage = memStorage();
    confirmCountry(sessionStorage, 'SE');
    const { RegistrationCountryGate, CountryChoice } = loadRegistrationModules({ sessionStorage });
    let signInCalls = 0;
    const countryOk = RegistrationCountryGate.allow(CountryChoice) === true;
    if (countryOk) signInCalls += 1;
    assert.equal(countryOk, true);
    assert.equal(signInCalls, 1);
  });
});

describe('Apple register language-before-country', () => {
  const iosPlatform = {
    isIOS: () => true,
    appleSignIn: {
      isAvailable: () => true,
      signIn: async () => ({ idToken: 'tok' }),
    },
  };

  it('unconfirmed language => reason language, signIn not reached', () => {
    const sessionStorage = memStorage();
    confirmCountry(sessionStorage, 'SE');
    const { window, RegisterAppleAuth, CountryChoice } = loadRegistrationModules({ sessionStorage });
    window.LanguageChoice = {
      isConfirmed: () => false,
      requireSelection: () => false,
    };
    const pre = RegisterAppleAuth.preflight(iosPlatform, CountryChoice);
    assert.equal(pre.ok, false);
    assert.equal(pre.reason, 'language');
  });

  it('applyDeniedPreflight language/country does not paint the Apple error box', () => {
    const { RegisterAppleAuth } = loadRegistrationModules();
    let appleErrorCalls = 0;
    RegisterAppleAuth.applyDeniedPreflight(
      { ok: false, reason: 'language', message: 'language.choice.required' },
      () => { appleErrorCalls += 1; }
    );
    RegisterAppleAuth.applyDeniedPreflight(
      { ok: false, reason: 'country', message: 'market.choice.required' },
      () => { appleErrorCalls += 1; }
    );
    assert.equal(appleErrorCalls, 0);
  });

  it('applyDeniedPreflight plugin failure still uses the Apple error box', () => {
    const { RegisterAppleAuth } = loadRegistrationModules();
    let appleErrorCalls = 0;
    RegisterAppleAuth.applyDeniedPreflight(
      { ok: false, reason: 'unavailable', message: 'auth.login.apple.unavailable' },
      () => { appleErrorCalls += 1; }
    );
    assert.equal(appleErrorCalls, 1);
  });

  it('country autoMounts immediately and stays independent from language', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/country-choice.js'), 'utf8');
    assert.match(src, /mounts\.forEach\(\(el\) => mount\(el\)\)/);
    assert.match(src, /Det är inte samma sak som språkval/);
    assert.doesNotMatch(src, /addEventListener\('language-choice-confirmed', start/);
  });
});

describe('Apple login does not preflight the registration country gate', () => {
  it('login Apple handler does not use the registration country gate', () => {
    const login = fs.readFileSync(path.join(ROOT, 'public/login.html'), 'utf8');
    const start = login.indexOf('async function handleAppleLogin');
    assert.ok(start > 0);
    const fn = login.slice(start, login.indexOf('function openAppleLinkModal', start));
    assert.doesNotMatch(fn, /CountryChoice/);
    assert.doesNotMatch(fn, /RegistrationCountryGate/);
    assert.doesNotMatch(fn, /RegisterAppleAuth/);
    assert.match(fn, /Platform\.isIOS\(\) && !Platform\.appleSignIn\.isAvailable\(\)/);
    assert.match(fn, /LoginOAuthCountry\.isCountryRequired/);
  });
});

describe('register.html wires preflight before native signIn', () => {
  it('Apple register calls preflight then appleSignIn.signIn', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/register.html'), 'utf8');
    assert.match(html, /register-apple-auth\.js/);
    assert.match(html, /registration-country-gate\.js/);
    const handler = html.slice(html.indexOf('async function handleAppleRegister'));
    const preIdx = handler.indexOf('RegisterAppleAuth.preflight');
    const signIdx = handler.indexOf('Platform.appleSignIn.signIn');
    assert.ok(preIdx > 0, 'preflight must be called');
    assert.ok(signIdx > preIdx, 'signIn must be after preflight');
    assert.doesNotMatch(handler, /CountryChoice\.requireSelection\(\)/);
    assert.match(handler, /RegisterAppleAuth\.applyDeniedPreflight/);
  });

  it('script-scope t() exists so confirmed-country Apple tap cannot throw ReferenceError', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/register.html'), 'utf8');
    const scriptStart = html.lastIndexOf('<script>');
    const script = html.slice(scriptStart);
    const tIdx = script.indexOf('function t(');
    const dcIdx = script.indexOf("document.addEventListener('DOMContentLoaded'");
    const appleIdx = script.indexOf('async function handleAppleRegister');
    assert.ok(tIdx > 0 && tIdx < dcIdx, 't() must be defined at script scope before DOMContentLoaded');
    assert.ok(appleIdx > tIdx, 'handleAppleRegister must see script-scope t()');
  });
});
