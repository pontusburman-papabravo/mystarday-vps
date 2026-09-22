'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadGate(opts) {
  opts = opts || {};
  const download = { hidden: true };
  const nativeRoot = { hidden: false };
  const form = {
    classList: {
      added: [],
      add(name) { this.added.push(name); },
    },
  };
  const sandbox = {
    console,
    Capacitor: opts.capacitor,
    Platform: {
      isNative() { return opts.native === true; },
    },
    location: { search: opts.search || '', pathname: opts.pathname || '/register' },
    document: {
      readyState: 'complete',
      documentElement: {
        classList: {
          contains(name) {
            return (opts.htmlClass || '') === name;
          },
        },
      },
      getElementById(id) {
        if (id === 'webSignupDownload') return download;
        if (id === 'registerNativeSignup') return nativeRoot;
        if (id === 'registerForm') return form;
        return null;
      },
      addEventListener() {},
    },
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('public/js/register-web-signup-gate.js'), sandbox, {
    filename: 'register-web-signup-gate.js',
  });
  sandbox.RegisterWebSignupGate.apply();
  return { sandbox, download, nativeRoot, form };
}

describe('public web signup closed', () => {
  it('register page has store download panel, login link, and native form', () => {
    const html = read('public/register.html');
    assert.match(html, /id="webSignupDownload"/);
    assert.match(html, /id="webSignupAppStore"/);
    assert.match(html, /id="webSignupPlayStore"/);
    assert.match(html, /https:\/\/apps\.apple\.com\/app\/id6774493098/);
    assert.match(html, /__PLAY_STORE_URL__/);
    assert.match(html, /id="webSignupDownload"[\s\S]*href="\/login"/);
    assert.match(html, /id="registerForm"/);
    assert.match(html, /id="registerNativeSignup"/);
    assert.match(html, /register-web-signup-gate\.js/);
    assert.match(html, /Auth\.api\('\/api\/auth\/register'/);
  });

  it('browser /register keeps the form so campaign traffic can finish signup', () => {
    const { sandbox, download, nativeRoot, form } = loadGate({ native: false, pathname: '/register' });
    assert.equal(sandbox.RegisterWebSignupGate.shouldClosePublicSignup(), false);
    assert.equal(download.hidden, true);
    assert.equal(nativeRoot.hidden, false);
    assert.deepEqual(form.classList.added, []);
  });

  it('browser /en/register keeps the registration form so Ireland can sign up from ads', () => {
    const { sandbox, download, nativeRoot, form } = loadGate({ native: false, pathname: '/en/register' });
    assert.equal(sandbox.RegisterWebSignupGate.shouldClosePublicSignup(), false);
    assert.equal(sandbox.RegisterWebSignupGate.isEnglishRegisterPath(), true);
    assert.equal(download.hidden, true);
    assert.equal(nativeRoot.hidden, false);
    assert.deepEqual(form.classList.added, []);
  });

  it('native WebView /register keeps the registration form', () => {
    const { sandbox, download, nativeRoot, form } = loadGate({ native: true });
    assert.equal(sandbox.RegisterWebSignupGate.shouldClosePublicSignup(), false);
    assert.equal(sandbox.RegisterWebSignupGate.isNativeShell(), true);
    assert.equal(download.hidden, true);
    assert.equal(nativeRoot.hidden, false);
    assert.deepEqual(form.classList.added, []);
  });

  it('platform-native class is treated as native WebView', () => {
    const { sandbox, nativeRoot, download } = loadGate({
      native: false,
      htmlClass: 'platform-native',
    });
    assert.equal(sandbox.RegisterWebSignupGate.shouldClosePublicSignup(), false);
    assert.equal(nativeRoot.hidden, false);
    assert.equal(download.hidden, true);
  });

  it('invite query keeps registration available on the web', () => {
    const { sandbox, download, nativeRoot } = loadGate({
      native: false,
      search: '?invite=abc123',
    });
    assert.equal(sandbox.RegisterWebSignupGate.shouldClosePublicSignup(), false);
    assert.equal(nativeRoot.hidden, false);
    assert.equal(download.hidden, true);
  });

  it('login and child-login pages still render their existing flows', () => {
    const login = read('public/login.html');
    const child = read('public/child-login.html');
    assert.match(login, /id="loginForm"/);
    assert.match(login, /\/api\/auth\/login/);
    assert.doesNotMatch(login, /id="webSignupDownload"/);
    assert.match(child, /id="clStepPin"/);
    assert.match(child, /id="clChildList"/);
    assert.match(child, /child-login\.js/);
  });

  it('invitation pages still accept new family and pedagog accounts', () => {
    const family = read('public/accept-invite.html');
    const pedagog = read('public/pedagog-invite.html');
    assert.match(family, /\/api\/family\/invite\/accept-new/);
    assert.match(family, /id="inviteForm"/);
    assert.match(pedagog, /\/api\/pedagog-invite\/accept-new/);
    assert.doesNotMatch(family, /RegisterWebSignupGate/);
    assert.doesNotMatch(pedagog, /RegisterWebSignupGate/);
    const registerApi = read('src/routes/auth/register.js');
    assert.match(registerApi, /router\.post\('\/register'/);
  });

  it('Swedish landing stays store-only; English landing sends new families to /en/register', () => {
    const pages = [
      'public/index.html',
      'public/om-oss.html',
      'public/faq.html',
      'public/pricing-info.html',
      'public/skattkammaren.html',
    ];
    for (const file of pages) {
      const html = read(file);
      assert.doesNotMatch(html, /href="\/register"/, `${file} still links to /register`);
      assert.doesNotMatch(html, /Skapa konto gratis/, `${file} still has Skapa konto gratis`);
    }
    const index = read('public/index.html');
    const en = read('public/en.html');
    assert.match(index, /https:\/\/apple\.co\/4v2ESuH/);
    assert.match(index, /__PLAY_STORE_URL__/);
    assert.match(index, /Hämta appen/);
    assert.doesNotMatch(en, /https:\/\/apple\.co\/4v2ESuH/);
    assert.match(en, /https:\/\/apps\.apple\.com\/app\/id6774493098/);
    assert.match(en, /href="\/en\/register"/);
    assert.match(en, /Create account/);
    assert.doesNotMatch(en, /href="\/register"/);
  });

  it('web-download copy exists in sv-SE and en-GB', () => {
    loadLocales();
    const keys = [
      'auth.register.webDownload.title',
      'auth.register.webDownload.lead',
      'auth.register.webDownload.appStoreAria',
      'auth.register.webDownload.playStoreAria',
      'auth.register.webDownload.hasAccount',
      'auth.register.webDownload.loginLink',
    ];
    for (const key of keys) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.notEqual(sv, key, `sv-SE missing ${key}`);
      assert.notEqual(en, key, `en-GB missing ${key}`);
      assert.notEqual(sv, en, `${key} should differ between locales`);
    }
    assert.match(t('sv-SE', 'auth.register.webDownload.title'), /Hämta/);
    assert.match(t('en-GB', 'auth.register.webDownload.title'), /Get the app/);
    assert.equal(t('sv-SE', 'auth.register.webDownload.loginLink'), 'Logga in');
    assert.equal(t('en-GB', 'auth.register.webDownload.loginLink'), 'Log in');
  });
});
