'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadOAuthRegistrationPayload(sessionStorage, localStorage) {
  const sessionStorageMock = {
    store: sessionStorage,
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; },
  };
  const localStorageMock = {
    store: localStorage,
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; },
  };
  const context = {
    window: {
      sessionStorage: sessionStorageMock,
      localStorage: localStorageMock,
      LoginLocale: {
        withLoginLocale(body) {
          const preferred = sessionStorageMock.getItem('sd_preferred_locale');
          if (!preferred) return body;
          return Object.assign({}, body, { preferred_locale: preferred });
        },
      },
      CountryChoice: {
        isConfirmed() {
          return sessionStorageMock.getItem('sd_country_confirmed') === '1'
            && Boolean(sessionStorageMock.getItem('sd_country_code'));
        },
        getCountryCode() {
          return sessionStorageMock.getItem('sd_country_code');
        },
      },
    },
    console,
  };
  context.global = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/js/oauth-registration-payload.js'), 'utf8'), context);
  return context.window.OAuthRegistrationPayload;
}

test('OAuthRegistrationPayload attaches country_code when CountryChoice confirmed', () => {
  const store = { sd_country_confirmed: '1', sd_country_code: 'IE', sd_preferred_locale: 'en-GB' };
  const OAuthRegistrationPayload = loadOAuthRegistrationPayload(store, {});
  const payload = OAuthRegistrationPayload.withOAuthRegistrationFields({ idToken: 'tok' });
  assert.equal(payload.country_code, 'IE');
  assert.equal(payload.preferred_locale, 'en-GB');
  assert.equal(payload.idToken, 'tok');
});

test('OAuthRegistrationPayload omits country_code when CountryChoice not confirmed', () => {
  const OAuthRegistrationPayload = loadOAuthRegistrationPayload({}, {});
  const payload = OAuthRegistrationPayload.withOAuthRegistrationFields({ idToken: 'tok' });
  assert.equal(payload.country_code, undefined);
});

test('Google auth client uses OAuthRegistrationPayload builder', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/google-auth-ui.js'), 'utf8');
  assert.match(src, /OAuthRegistrationPayload\.withOAuthRegistrationFields/);
});

test('Apple login client uses OAuthRegistrationPayload builder', () => {
  const loginHtml = fs.readFileSync(path.join(ROOT, 'public/login.html'), 'utf8');
  assert.match(loginHtml, /OAuthRegistrationPayload\.withOAuthRegistrationFields/);
});

test('Apple register client uses OAuthRegistrationPayload builder', () => {
  const registerHtml = fs.readFileSync(path.join(ROOT, 'public/register.html'), 'utf8');
  assert.match(registerHtml, /OAuthRegistrationPayload\.withOAuthRegistrationFields/);
});

test('iap-manager purchasePackage does not fall back to monthly tier', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/iap-manager.js'), 'utf8');
  assert.doesNotMatch(src, /packages\[tier\]\)\s*\|\|\s*_config\.packages\.monthly/);
});
