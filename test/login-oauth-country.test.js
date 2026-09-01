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

function loadLoginOAuthCountry(opts) {
  opts = opts || {};
  const sessionStorage = opts.sessionStorage || memStorage();
  const select = {
    value: opts.selectValue || '',
    options: [{ value: '' }, { value: 'SE' }, { value: 'US' }],
    focus() { select._focused = true; },
    dispatchEvent() { select._changed = true; },
  };
  const titleEl = { textContent: 'One more step' };
  const bodyEl = { textContent: 'body' };
  const btnEl = {
    textContent: 'Continue',
    disabled: false,
    dataset: {},
    addEventListener() {},
  };
  const serverError = { textContent: '', hidden: true };
  const panelEl = {
    hidden: true,
    scrollIntoView() { panelEl._scrolled = true; },
    querySelector(sel) {
      if (sel === '[data-i18n="auth.login.oauthCountry.title"]') return titleEl;
      if (sel === '[data-i18n="auth.login.oauthCountry.body"]') return bodyEl;
      if (sel === '[data-i18n="auth.login.oauthCountry.continue"]') return btnEl;
      return null;
    },
  };
  const appleError = { textContent: 'Choose your country before creating an account', style: { display: '' }, classList: { add() {}, remove() {} } };
  const elements = {
    loginOAuthCountryPanel: panelEl,
    loginOAuthCountryServerError: serverError,
    loginOAuthCountryContinue: btnEl,
    countryChoiceSelect: select,
    appleLoginError: appleError,
    googleLoginError: { textContent: '', style: { display: 'none' }, classList: { add() {}, remove() {} } },
  };

  const document = {
    getElementById(id) { return elements[id] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    readyState: 'complete',
    head: { appendChild() {} },
    createElement() { return { id: '', textContent: '' }; },
  };
  const window = {
    sessionStorage,
    document,
    I18n: { t(key) { return key; }, apply() {} },
    authT(key) { return key; },
    CountryChoice: opts.CountryChoice || {
      requireSelection() { return sessionStorage.getItem('sd_country_confirmed') === '1'; },
    },
    AppleSignInDiagnostics: {
      hideErrors() { appleError.textContent = ''; appleError.style.display = 'none'; },
    },
  };
  const context = { window, document, sessionStorage, console };
  context.global = window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/js/login-oauth-country.js'), 'utf8'), context);
  return {
    LoginOAuthCountry: context.window.LoginOAuthCountry,
    panelEl,
    appleError,
    select,
    serverError,
    sessionStorage,
    btnEl,
  };
}

describe('LoginOAuthCountry', () => {
  it('detects COUNTRY_REQUIRED without treating other 400s as country', () => {
    const { LoginOAuthCountry } = loadLoginOAuthCountry();
    assert.equal(LoginOAuthCountry.isCountryRequired(400, { code: 'COUNTRY_REQUIRED' }), true);
    assert.equal(LoginOAuthCountry.isCountryRequired(400, { error: 'Choose your country before creating an account' }), false);
    assert.equal(LoginOAuthCountry.isCountryRequired(401, { code: 'COUNTRY_REQUIRED' }), false);
    assert.equal(LoginOAuthCountry.isMarketClosed(403, { code: 'MARKET_US_CLOSED' }), true);
    assert.equal(LoginOAuthCountry.isMarketClosed(400, { code: 'COUNTRY_REQUIRED' }), false);
  });

  it('reveal stores the pending token and does not keep the Apple error banner', () => {
    const { LoginOAuthCountry, panelEl, appleError, sessionStorage } = loadLoginOAuthCountry();
    const shown = LoginOAuthCountry.reveal({ provider: 'apple', idToken: 'tok-1', name: 'Ada' });
    assert.equal(shown, true);
    assert.equal(panelEl.hidden, false);
    assert.equal(appleError.textContent, '');
    assert.equal(appleError.style.display, 'none');
    const pending = JSON.parse(sessionStorage.getItem('sd_login_oauth_pending'));
    assert.equal(pending.provider, 'apple');
    assert.equal(pending.idToken, 'tok-1');
    assert.equal(pending.name, 'Ada');
  });

  it('suggests Sweden when the country select is empty', () => {
    const { LoginOAuthCountry, select } = loadLoginOAuthCountry();
    LoginOAuthCountry.reveal({ provider: 'apple', idToken: 'tok' });
    assert.equal(select.value, 'SE');
  });

  it('confirmSelectedCountry is fail-closed when CountryChoice denies', () => {
    const { LoginOAuthCountry } = loadLoginOAuthCountry({
      CountryChoice: { requireSelection() { return false; } },
    });
    LoginOAuthCountry.reveal({ provider: 'apple', idToken: 'tok' });
    assert.equal(LoginOAuthCountry.confirmSelectedCountry(), false);
  });

  it('stores a pending token that the login retry can reuse', () => {
    const { LoginOAuthCountry } = loadLoginOAuthCountry({
      CountryChoice: { requireSelection() { return true; } },
    });
    LoginOAuthCountry.reveal({ provider: 'apple', idToken: 'tok-retry', name: 'Ada' });
    assert.equal(LoginOAuthCountry.confirmSelectedCountry(), true);
    const pending = LoginOAuthCountry.getPending();
    assert.equal(pending.idToken, 'tok-retry');
    assert.equal(pending.provider, 'apple');
    LoginOAuthCountry.clearPending();
    assert.equal(LoginOAuthCountry.getPending(), null);
  });
});

describe('login.html Apple recovery wiring', () => {
  it('loads country modules and recovers COUNTRY_REQUIRED without CountryChoice preflight', () => {
    const login = fs.readFileSync(path.join(ROOT, 'public/login.html'), 'utf8');
    assert.match(login, /login-oauth-country\.js/);
    assert.match(login, /country-choice\.js/);
    assert.match(login, /id="loginOAuthCountryPanel"/);
    const start = login.indexOf('async function handleAppleLogin');
    const fn = login.slice(start, login.indexOf('function openAppleLinkModal', start));
    assert.match(fn, /LoginOAuthCountry\.isCountryRequired/);
    assert.match(fn, /LoginOAuthCountry\.reveal/);
    assert.doesNotMatch(fn, /RegistrationCountryGate/);
    assert.doesNotMatch(fn, /RegisterAppleAuth/);
    assert.doesNotMatch(fn, /CountryChoice/);
  });

  it('does not paint COUNTRY_REQUIRED through showError', () => {
    const login = fs.readFileSync(path.join(ROOT, 'public/login.html'), 'utf8');
    const start = login.indexOf('async function handleAppleLogin');
    const fn = login.slice(start, login.indexOf('function openAppleLinkModal', start));
    const requiredIdx = fn.indexOf('LoginOAuthCountry.isCountryRequired');
    const showErrorIdx = fn.lastIndexOf('diag.showError');
    assert.ok(requiredIdx > 0, 'must handle COUNTRY_REQUIRED');
    assert.ok(showErrorIdx > requiredIdx, 'generic Apple error stays a fallback after country recovery');
    assert.match(fn, /return;\s*\n\s*\}/);
  });
});

describe('google-auth-ui login COUNTRY_REQUIRED', () => {
  it('login path recovers COUNTRY_REQUIRED and can retry with the same token', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/google-auth-ui.js'), 'utf8');
    assert.match(src, /LoginOAuthCountry\.isCountryRequired/);
    assert.match(src, /existingIdToken/);
    assert.match(src, /registerRetry\('google'/);
    assert.match(src, /pageKind\(\) === 'register'/);
  });
});
